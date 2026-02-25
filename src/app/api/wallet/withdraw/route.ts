import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { withdrawalSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";

const MIN_WITHDRAWAL = 5000;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(withdrawals);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch withdrawals" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = validateBody(withdrawalSchema, body);
    if (!validation.success) return validation.response;
    const { amount, pixKey } = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.coins < amount) {
      return NextResponse.json(
        { error: "Saldo insuficiente" },
        { status: 403 }
      );
    }

    const pendingWithdrawal = await prisma.withdrawalRequest.findFirst({
      where: { userId, status: "PENDING" },
    });

    if (pendingWithdrawal) {
      return NextResponse.json(
        { error: "Você já tem um saque pendente. Aguarde a análise." },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: amount } },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: "WITHDRAWAL",
          amount: -amount,
          description: `Solicitação de saque: ${amount} moedas`,
        },
      });

      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          userId,
          amount,
          pixKey,
        },
      });

      return withdrawal;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create withdrawal request" },
      { status: 500 }
    );
  }
}
