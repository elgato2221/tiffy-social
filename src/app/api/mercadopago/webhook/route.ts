import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MercadoPago sends different notification types
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
          description: `Compra MercadoPago: ${coinAmount} moedas (${externalReference})`,
        },
      });
    });

    console.log(`MercadoPago payment processed: ${coinAmount} coins for user ${userId}, payment ${paymentId}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("MercadoPago webhook error:", error);
    // Always return 200 to avoid MercadoPago retrying
    return NextResponse.json({ ok: true });
  }
}
