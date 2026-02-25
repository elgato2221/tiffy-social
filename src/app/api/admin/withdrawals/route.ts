import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { adminWithdrawalActionSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const withdrawals = await prisma.withdrawalRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            email: true,
            coins: true,
          },
        },
      },
    });

    return NextResponse.json(withdrawals);
  } catch (error) {
    console.error("Admin withdrawals GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar saques" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validation = validateBody(adminWithdrawalActionSchema, body);
    if (!validation.success) return validation.response;
    const { withdrawalId, action, reason } = validation.data;

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      return NextResponse.json(
        { error: "Saque nao encontrado" },
        { status: 404 }
      );
    }

    if (withdrawal.status !== "PENDING") {
      return NextResponse.json(
        { error: "Saque ja foi processado" },
        { status: 400 }
      );
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    await prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: { status: newStatus },
      });

      await tx.auditLog.create({
        data: {
          adminId: session.user.id,
          action: action === "APPROVE" ? "APPROVE_WITHDRAWAL" : "REJECT_WITHDRAWAL",
          targetType: "WITHDRAWAL",
          targetId: withdrawalId,
          details: reason || `Saque ${newStatus === "APPROVED" ? "aprovado" : "rejeitado"}`,
        },
      });

      // If rejected, refund the coins
      if (action === "REJECT") {
        await tx.user.update({
          where: { id: withdrawal.userId },
          data: { coins: { increment: withdrawal.amount } },
        });
        await tx.transaction.create({
          data: {
            userId: withdrawal.userId,
            type: "REFUND",
            amount: withdrawal.amount,
            description: "Saque rejeitado - moedas devolvidas",
          },
        });
      }
    });

    return NextResponse.json({ success: true, action, status: newStatus });
  } catch (error) {
    console.error("Admin withdrawals POST error:", error);
    return NextResponse.json(
      { error: "Erro ao processar saque" },
      { status: 500 }
    );
  }
}
