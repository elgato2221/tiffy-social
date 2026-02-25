import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendGiftSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";
import { giftTypeToEmoji, PLATFORM_FEE } from "@/lib/utils";

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
    const validation = validateBody(sendGiftSchema, body);
    if (!validation.success) return validation.response;
    const { receiverId, type, value } = validation.data;

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

    // Platform takes 35% fee
    const receiverAmount = Math.floor(value * (1 - PLATFORM_FEE));

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: value } },
      });

      await tx.user.update({
        where: { id: receiverId },
        data: { coins: { increment: receiverAmount } },
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

      // Create a message so the gift appears in chat
      await tx.message.create({
        data: {
          senderId: userId,
          receiverId,
          content: `Enviou ${type}`,
          type: "gift",
          cost: 0,
          giftType: type,
          giftEmoji: giftTypeToEmoji(type),
          giftValue: value,
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
          amount: receiverAmount,
          description: `Received ${type} gift`,
        },
      });

      return gift;
    });

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to send gift" },
      { status: 500 }
    );
  }
}
