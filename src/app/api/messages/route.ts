import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MESSAGE_COST, AUDIO_COST, PLATFORM_FEE } from "@/lib/utils";
import { sendMessageSchema } from "@/lib/validations";
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

    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: { id: true, name: true, username: true, avatar: true },
        },
        receiver: {
          select: { id: true, name: true, username: true, avatar: true },
        },
      },
    });

    const conversationMap = new Map<
      string,
      {
        user: { id: string; name: string; username: string; avatar: string | null };
        lastMessage: (typeof messages)[0];
        unreadCount: number;
      }
    >();

    for (const message of messages) {
      const otherUserId =
        message.senderId === userId ? message.receiverId : message.senderId;
      const otherUser =
        message.senderId === userId ? message.receiver : message.sender;

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          user: otherUser,
          lastMessage: message,
          unreadCount: 0,
        });
      }

      if (
        message.receiverId === userId &&
        !message.read
      ) {
        const conv = conversationMap.get(otherUserId)!;
        conv.unreadCount += 1;
      }
    }

    const conversations = Array.from(conversationMap.values());

    return NextResponse.json(conversations);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
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
    const validation = validateBody(sendMessageSchema, body);
    if (!validation.success) return validation.response;
    const { receiverId, content, type, mediaUrl, mediaType, mediaPrice } = validation.data;

    // Look up receiver's custom message cost
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { messageCost: true },
    });
    const receiverMessageCost = receiver?.messageCost ?? MESSAGE_COST;

    // Locked media messages are free to send (unlock costs separately)
    // Gift messages are free (gift cost handled in gifts API)
    const baseCost = type === "locked_media" || type === "gift"
      ? 0
      : type === "audio"
        ? AUDIO_COST
        : receiverMessageCost;

    const sender = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    // Determine who initiated the conversation
    const firstMessage = await prisma.message.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId },
          { senderId: receiverId, receiverId: userId },
        ],
        type: { notIn: ["gift"] },
      },
      orderBy: { createdAt: "asc" },
      select: { senderId: true },
    });

    // Initiator pays, responder is free
    let cost = 0;
    if (!firstMessage || firstMessage.senderId === userId) {
      cost = baseCost;
    }

    if (cost > 0 && sender.coins < cost) {
      return NextResponse.json(
        { error: "Moedas insuficientes" },
        { status: 403 }
      );
    }

    // Platform takes 30% fee, receiver gets 70%
    const receiverAmount = cost > 0 ? Math.floor(cost * (1 - PLATFORM_FEE)) : 0;

    const result = await prisma.$transaction(async (tx) => {
      if (cost > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { coins: { decrement: cost } },
        });

        if (receiverAmount > 0) {
          await tx.user.update({
            where: { id: receiverId },
            data: { coins: { increment: receiverAmount } },
          });
        }

        await tx.transaction.create({
          data: {
            userId,
            type: "MESSAGE_SENT",
            amount: -cost,
            description: `Sent message to user`,
          },
        });

        if (receiverAmount > 0) {
          await tx.transaction.create({
            data: {
              userId: receiverId,
              type: "MESSAGE_RECEIVED",
              amount: receiverAmount,
              description: `Received message from user`,
            },
          });
        }
      }

      const message = await tx.message.create({
        data: {
          senderId: userId,
          receiverId,
          content,
          type,
          cost,
          ...(type === "locked_media" && {
            mediaUrl,
            mediaType,
            mediaPrice,
            mediaUnlocked: false,
          }),
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

      return message;
    });

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
