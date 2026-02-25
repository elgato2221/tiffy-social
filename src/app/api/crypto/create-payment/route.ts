import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

const COIN_PACKAGES: Record<number, number> = {
  100: 9.9,
  500: 39.9,
  1000: 69.9,
  5000: 299.9,
  10000: 499.9,
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount } = await req.json();
    const priceUSD = COIN_PACKAGES[amount];

    if (!priceUSD) {
      return NextResponse.json({ error: "Pacote invalido" }, { status: 400 });
    }

    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")
        ? process.env.NEXTAUTH_URL
        : "https://tiffy-social.vercel.app";

    // Create NOWPayments invoice
    const response = await fetch(`${NOWPAYMENTS_API}/invoice`, {
      method: "POST",
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: priceUSD,
        price_currency: "brl",
        order_id: `${session.user.id}_${amount}_${Date.now()}`,
        order_description: `${amount} moedas Tiffy Social`,
        ipn_callback_url: `${baseUrl}/api/crypto/webhook`,
        success_url: `${baseUrl}/wallet?payment=success`,
        cancel_url: `${baseUrl}/wallet?payment=cancelled`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("NOWPayments error:", error);
      return NextResponse.json(
        { error: "Erro ao criar pagamento. Tente novamente." },
        { status: 500 }
      );
    }

    const invoice = await response.json();

    return NextResponse.json({
      invoice_url: invoice.invoice_url,
      invoice_id: invoice.id,
    });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: "Erro ao criar pagamento" },
      { status: 500 }
    );
  }
}
