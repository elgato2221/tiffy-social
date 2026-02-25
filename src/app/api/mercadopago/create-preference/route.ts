import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MercadoPagoConfig, Preference } from "mercadopago";

const COIN_PACKAGES: Record<number, { price: number; label: string }> = {
  100: { price: 9.9, label: "100 moedas" },
  500: { price: 39.9, label: "500 moedas" },
  1000: { price: 69.9, label: "1.000 moedas" },
  5000: { price: 299.9, label: "5.000 moedas" },
  10000: { price: 499.9, label: "10.000 moedas" },
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount } = await req.json();
    const pkg = COIN_PACKAGES[amount];

    if (!pkg) {
      return NextResponse.json({ error: "Pacote invalido" }, { status: 400 });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
    if (!accessToken) {
      return NextResponse.json({ error: "Gateway nao configurado" }, { status: 500 });
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")
        ? process.env.NEXTAUTH_URL
        : "https://tiffy-social.vercel.app";

    const externalReference = `${session.user.id}_${amount}_${Date.now()}`;

    const result = await preference.create({
      body: {
        items: [
          {
            id: `coins_${amount}`,
            title: `Tiffy Social - ${pkg.label}`,
            description: `Pacote de ${pkg.label} para usar na Tiffy Social`,
            quantity: 1,
            unit_price: pkg.price,
            currency_id: "BRL",
          },
        ],
        back_urls: {
          success: `${baseUrl}/wallet?payment=success`,
          failure: `${baseUrl}/wallet?payment=failed`,
          pending: `${baseUrl}/wallet?payment=pending`,
        },
        auto_return: "approved",
        external_reference: externalReference,
        notification_url: `${baseUrl}/api/mercadopago/webhook`,
      },
    });

    return NextResponse.json({
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
      preference_id: result.id,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("MercadoPago error:", errMsg, error);
    return NextResponse.json(
      { error: `Erro ao criar pagamento: ${errMsg}` },
      { status: 500 }
    );
  }
}
