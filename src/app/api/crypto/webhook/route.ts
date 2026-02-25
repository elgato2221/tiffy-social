import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const payload = JSON.parse(body);

    // Verify IPN signature
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (ipnSecret) {
      const signature = req.headers.get("x-nowpayments-sig");
      if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }

      // Sort payload keys and create HMAC
      const sorted = Object.keys(payload)
        .sort()
        .reduce((acc: Record<string, unknown>, key) => {
          acc[key] = payload[key];
          return acc;
        }, {});

      const hmac = crypto
        .createHmac("sha512", ipnSecret)
        .update(JSON.stringify(sorted))
        .digest("hex");

      if (hmac !== signature) {
        console.error("IPN signature mismatch");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const { payment_status, order_id, actually_paid, pay_amount } = payload;

    // Only process confirmed/finished payments
    if (payment_status !== "finished" && payment_status !== "confirmed") {
      // Acknowledge but don't process yet
      return NextResponse.json({ ok: true });
    }

    // Parse order_id: userId_coinAmount_timestamp
    const parts = order_id?.split("_");
    if (!parts || parts.length < 3) {
      console.error("Invalid order_id:", order_id);
      return NextResponse.json({ error: "Invalid order" }, { status: 400 });
    }

    const userId = parts[0];
    const coinAmount = parseInt(parts[1]);
    const timestamp = parts[2];

    if (!userId || !coinAmount || isNaN(coinAmount)) {
      console.error("Invalid order data:", { userId, coinAmount });
      return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
    }

    // Check if this payment was already processed (idempotency)
    const existingTx = await prisma.transaction.findFirst({
      where: {
        userId,
        type: "PURCHASE",
        description: { contains: order_id },
      },
    });

    if (existingTx) {
      // Already processed
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
          description: `Compra crypto: ${coinAmount} moedas (${order_id})`,
        },
      });
    });

    console.log(`Crypto payment processed: ${coinAmount} coins for user ${userId}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    // Always return 200 to avoid NowPayments retrying for non-retryable errors
    return NextResponse.json({ ok: false, error: "Processing failed" });
  }
}
