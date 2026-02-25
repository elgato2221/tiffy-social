import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoiceId = req.nextUrl.searchParams.get("invoice_id");
    if (!invoiceId) {
      return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
    }

    const response = await fetch(`${NOWPAYMENTS_API}/payment/?invoiceId=${invoiceId}`, {
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Erro ao verificar pagamento" }, { status: 500 });
    }

    const data = await response.json();

    return NextResponse.json({
      status: data.data?.[0]?.payment_status || "waiting",
    });
  } catch (error) {
    console.error("Payment status error:", error);
    return NextResponse.json({ error: "Erro ao verificar status" }, { status: 500 });
  }
}
