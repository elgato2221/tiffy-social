import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { purchaseCoinsSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      balance: user.coins,
      transactions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch wallet" },
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
    const validation = validateBody(purchaseCoinsSchema, body);
    if (!validation.success) return validation.response;
    const { amount } = validation.data;

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { coins: { increment: amount } },
        select: { coins: true },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: "PURCHASE",
          amount,
          description: `Purchased ${amount} coins`,
        },
      });

      return updatedUser;
    });

    return NextResponse.json({
      balance: result.coins,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to purchase coins" },
      { status: 500 }
    );
  }
}
