import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
  } catch (error) {
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

    const { receiverId, content } = await req.json();

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: "receiverId and content are required" },
        { status: 400 }
      );
    }

    const sender = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    const cost = sender.gender === "MALE" ? 5 : 0;

    if (cost > 0 && sender.coins < cost) {
      return NextResponse.json(
        { error: "Insufficient coins" },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      if (cost > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { coins: { decrement: cost } },
        });

        await tx.user.update({
          where: { id: receiverId },
          data: { coins: { increment: cost } },
        });

        await tx.transaction.create({
          data: {
            userId,
            type: "MESSAGE_SENT",
            amount: -cost,
            description: `Sent message to user`,
          },
        });

        await tx.transaction.create({
          data: {
            userId: receiverId,
            type: "MESSAGE_RECEIVED",
            amount: cost,
            description: `Received message from user`,
          },
        });
      }

      const message = await tx.message.create({
        data: {
          senderId: userId,
          receiverId,
          content,
          cost,
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
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
