import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { withdrawalSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";

const MIN_WITHDRAWAL = 5000;
const EARNING_TYPES = ["MESSAGE_RECEIVED", "GIFT_RECEIVED", "COMMENT_RECEIVED", "GALLERY_EARNING", "MEDIA_EARNING"];

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

    const [withdrawals, user, earningsAgg, withdrawnAgg, heldEarningsAgg] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { coins: true, verified: true, createdAt: true },
      }),
      // Total earned coins (all time)
      prisma.transaction.aggregate({
        where: { userId, type: { in: EARNING_TYPES } },
        _sum: { amount: true },
      }),
      // Total withdrawn coins (negative amounts)
      prisma.transaction.aggregate({
        where: { userId, type: "WITHDRAWAL" },
        _sum: { amount: true },
      }),
      // Held earnings (from credit card purchases, still in hold period)
      prisma.transaction.aggregate({
        where: { userId, type: { in: EARNING_TYPES }, heldUntil: { gt: new Date() } },
        _sum: { amount: true },
      }),
    ]);

    const totalEarned = earningsAgg._sum.amount || 0;
    const totalWithdrawn = Math.abs(withdrawnAgg._sum.amount || 0);
    const heldCoins = heldEarningsAgg._sum.amount || 0;
    const availableForWithdrawal = Math.max(0, totalEarned - totalWithdrawn - heldCoins);

    return NextResponse.json({
      withdrawals,
      verified: user?.verified || false,
      totalEarned,
      heldCoins,
      availableForWithdrawal,
    });
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
    const { amount, withdrawMethod, pixKey, paypalEmail } = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true, verified: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Must be verified to withdraw
    if (!user.verified) {
      return NextResponse.json(
        { error: "Voce precisa verificar seu perfil para solicitar saques." },
        { status: 403 }
      );
    }

    // Account must be at least 7 days old
    const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
    if (accountAgeMs < 7 * 24 * 60 * 60 * 1000) {
      const remaining = Math.ceil((7 * 24 * 60 * 60 * 1000 - accountAgeMs) / (1000 * 60 * 60 * 24));
      return NextResponse.json(
        { error: `Sua conta precisa ter pelo menos 7 dias. Aguarde mais ${remaining} dias.` },
        { status: 403 }
      );
    }

    // Check total balance
    if (user.coins < amount) {
      return NextResponse.json(
        { error: "Saldo insuficiente" },
        { status: 403 }
      );
    }

    // Only earned coins can be withdrawn (never purchased coins)
    // Earnings from credit card purchases are held for 30 days
    const [earningsAgg, withdrawnAgg, heldEarningsAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: { in: EARNING_TYPES } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "WITHDRAWAL" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: { in: EARNING_TYPES }, heldUntil: { gt: new Date() } },
        _sum: { amount: true },
      }),
    ]);

    const totalEarned = earningsAgg._sum.amount || 0;
    const totalWithdrawn = Math.abs(withdrawnAgg._sum.amount || 0);
    const heldCoins = heldEarningsAgg._sum.amount || 0;
    const availableForWithdrawal = Math.max(0, totalEarned - totalWithdrawn - heldCoins);

    if (amount > availableForWithdrawal) {
      const heldMsg = heldCoins > 0 ? ` (${heldCoins} em retencao de 30 dias)` : "";
      return NextResponse.json(
        {
          error: `Disponivel para saque: ${availableForWithdrawal} moedas${heldMsg}. Somente moedas ganhas podem ser sacadas.`,
          availableForWithdrawal,
          heldCoins,
        },
        { status: 403 }
      );
    }

    // Only 1 pending withdrawal at a time
    const pendingWithdrawal = await prisma.withdrawalRequest.findFirst({
      where: { userId, status: "PENDING" },
    });

    if (pendingWithdrawal) {
      return NextResponse.json(
        { error: "Voce ja tem um saque pendente. Aguarde a analise." },
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
          description: `Solicitacao de saque: ${amount} moedas`,
        },
      });

      const withdrawal = await tx.withdrawalRequest.create({
        data: {
          userId,
          amount,
          withdrawMethod,
          pixKey: pixKey || null,
          paypalEmail: paypalEmail || null,
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
