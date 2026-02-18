import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || currentUserId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isOwner = currentUserId === userId;

    const items = await prisma.galleryItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    let unlockedItemIds: Set<string> = new Set();

    if (!isOwner && currentUserId) {
      const unlocks = await prisma.galleryUnlock.findMany({
        where: {
          userId: currentUserId,
          itemId: { in: items.map((item) => item.id) },
        },
        select: { itemId: true },
      });
      unlockedItemIds = new Set(unlocks.map((u) => u.itemId));
    }

    const result = items.map((item) => {
      const unlocked = isOwner || unlockedItemIds.has(item.id);
      return {
        id: item.id,
        url: unlocked ? item.url : null,
        type: item.type,
        price: item.price,
        caption: item.caption,
        createdAt: item.createdAt,
        unlocked,
        userId: item.userId,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch gallery" },
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
    const { url, type = "PHOTO", price = 10, caption } = body;

    if (!url) {
      return NextResponse.json(
        { error: "url is required" },
        { status: 400 }
      );
    }

    const item = await prisma.galleryItem.create({
      data: {
        userId,
        url,
        type,
        price,
        caption: caption || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create gallery item" },
      { status: 500 }
    );
  }
}
