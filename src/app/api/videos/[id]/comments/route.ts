import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { COMMENT_COST, PLATFORM_FEE } from "@/lib/utils";
import { createCommentSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";
import { getHeldUntilForSender } from "@/lib/held-coins";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const comments = await prisma.comment.findMany({
      where: { videoId: id, parentId: null },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: videoId } = await params;
    const body = await req.json();
    const validation = validateBody(createCommentSchema, body);
    if (!validation.success) return validation.response;
    const { content, parentId } = validation.data;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Validate parentId belongs to the same video
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment || parentComment.videoId !== videoId) {
        return NextResponse.json({ error: "Comentário pai não encontrado" }, { status: 404 });
      }
    }

    const sender = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!sender) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Video owner comments for free
    const isVideoOwner = video.userId === userId;

    if (!isVideoOwner && sender.coins < COMMENT_COST) {
      return NextResponse.json(
        { error: "Moedas insuficientes. Comentar custa 10 moedas." },
        { status: 403 }
      );
    }

    // Platform takes 35% fee
    const ownerAmount = Math.floor(COMMENT_COST * (1 - PLATFORM_FEE));
    const earningHeldUntil = !isVideoOwner ? await getHeldUntilForSender(userId) : null;

    const result = await prisma.$transaction(async (tx) => {
      if (!isVideoOwner) {
        // Deduct full cost from commenter
        await tx.user.update({
          where: { id: userId },
          data: { coins: { decrement: COMMENT_COST } },
        });

        // Credit reduced amount to video owner (after platform fee)
        await tx.user.update({
          where: { id: video.userId },
          data: { coins: { increment: ownerAmount } },
        });

        // Transaction: commenter spent
        await tx.transaction.create({
          data: {
            userId,
            type: "COMMENT_SENT",
            amount: -COMMENT_COST,
            description: "Comentou em um vídeo",
          },
        });

        // Transaction: video owner earned (after fee)
        await tx.transaction.create({
          data: {
            userId: video.userId,
            type: "COMMENT_RECEIVED",
            amount: ownerAmount,
            description: "Recebeu comentário em seu vídeo",
            heldUntil: earningHeldUntil,
          },
        });
      }

      // Create the comment
      const comment = await tx.comment.create({
        data: {
          content,
          userId,
          videoId,
          parentId: parentId || null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      // Notification
      if (video.userId !== userId) {
        await tx.notification.create({
          data: {
            type: "COMMENT",
            fromId: userId,
            fromName: sender.name,
            refId: videoId,
            userId: video.userId,
          },
        });
      }

      return comment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
