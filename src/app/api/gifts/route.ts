import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    const { receiverId, type, value } = await req.json();

    if (!receiverId || !type || !value) {
      return NextResponse.json(
        { error: "receiverId, type, and value are required" },
        { status: 400 }
      );
    }

    if (value <= 0) {
      return NextResponse.json(
        { error: "Gift value must be positive" },
        { status: 400 }
      );
    }

    const sender = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    if (sender.coins < value) {
      return NextResponse.json(
        { error: "Insufficient coins" },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: value } },
      });

      await tx.user.update({
        where: { id: receiverId },
        data: { coins: { increment: value } },
      });

      const gift = await tx.gift.create({
        data: {
          senderId: userId,
          receiverId,
          type,
          value,
        },
        include: {
          sender: {
            select: { id: true, name: true, username: true, avatar: true },
          },
          receiver: {
            select: { id: true, name: true, username: true, avatar: true },
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: "GIFT_SENT",
          amount: -value,
          description: `Sent ${type} gift`,
        },
      });

      await tx.transaction.create({
        data: {
          userId: receiverId,
          type: "GIFT_RECEIVED",
          amount: value,
          description: `Received ${type} gift`,
        },
      });

      return gift;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send gift" },
      { status: 500 }
    );
  }
}
