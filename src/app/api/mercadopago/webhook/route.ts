import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle chargebacks - auto-suspend user
    if (body.type === "chargebacks" || body.action?.startsWith("chargebacks.")) {
      await handleChargeback(body);
      return NextResponse.json({ ok: true });
    }

    // We only care about payment notifications
    if (body.type !== "payment" && body.action !== "payment.updated") {
      return NextResponse.json({ ok: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ ok: true });
    }

    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    });

    const paymentClient = new Payment(client);

    // Fetch payment details from MercadoPago API
    const payment = await paymentClient.get({ id: paymentId });

    if (!payment || payment.status !== "approved") {
      // Payment not approved yet, acknowledge webhook
      return NextResponse.json({ ok: true });
    }

    const externalReference = payment.external_reference;
    if (!externalReference) {
      console.error("Missing external_reference in payment:", paymentId);
      return NextResponse.json({ ok: true });
    }

    // Parse external_reference: userId_coinAmount_timestamp
    const parts = externalReference.split("_");
    if (parts.length < 3) {
      console.error("Invalid external_reference:", externalReference);
      return NextResponse.json({ ok: true });
    }

    const userId = parts[0];
    const coinAmount = parseInt(parts[1]);

    if (!userId || !coinAmount || isNaN(coinAmount)) {
      console.error("Invalid order data:", { userId, coinAmount });
      return NextResponse.json({ ok: true });
    }

    // Idempotency: check if already processed
    const existingTx = await prisma.transaction.findFirst({
      where: {
        userId,
        type: "PURCHASE",
        description: { contains: externalReference },
      },
    });

    if (existingTx) {
      return NextResponse.json({ ok: true, message: "Already processed" });
    }

    // Determine payment method: credit/debit card = 30 day hold, PIX = no hold
    const paymentType = payment.payment_type_id || "";
    const isCard = paymentType === "credit_card" || paymentType === "debit_card";
    const heldUntil = isCard ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;

    // Credit coins to user
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { coins: { increment: coinAmount } },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: "PURCHASE",
          amount: coinAmount,
          description: `Compra MercadoPago (${isCard ? "cartao" : "PIX"}): ${coinAmount} moedas (${externalReference})`,
          heldUntil,
        },
      });
    });

    console.log(`MercadoPago payment processed: ${coinAmount} coins for user ${userId} (${isCard ? "card, 30d hold" : "PIX, no hold"})`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("MercadoPago webhook error:", error);
    // Always return 200 to avoid MercadoPago retrying
    return NextResponse.json({ ok: true });
  }
}

async function handleChargeback(body: Record<string, unknown>) {
  try {
    const chargebackId = (body.data as Record<string, unknown>)?.id;
    if (!chargebackId) return;

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) return;

    // Fetch chargeback details
    const res = await fetch(
      `https://api.mercadopago.com/v1/chargebacks/${chargebackId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return;

    const chargeback = await res.json();
    const paymentId = chargeback.payment_id;
    if (!paymentId) return;

    // Get the payment to find the user
    const client = new MercadoPagoConfig({ accessToken });
    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: paymentId });
    const externalReference = payment.external_reference;
    if (!externalReference) return;

    const userId = externalReference.split("_")[0];
    if (!userId) return;

    // Suspend account and log
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: "SUSPENDED",
          banReason: `Chargeback detectado (pagamento ${paymentId}). Conta suspensa automaticamente.`,
          bannedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          adminId: "SYSTEM",
          action: "SUSPEND_USER",
          targetType: "USER",
          targetId: userId,
          details: `Auto-suspend: chargeback ${chargebackId} no pagamento ${paymentId}`,
        },
      });
    });

    console.log(`CHARGEBACK: User ${userId} suspended due to chargeback ${chargebackId}`);
  } catch (err) {
    console.error("Chargeback processing error:", err);
  }
}
