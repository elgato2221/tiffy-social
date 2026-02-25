import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unlockGallerySchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";
import { PLATFORM_FEE } from "@/lib/utils";
import { getHeldUntilForSender } from "@/lib/held-coins";

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
    const validation = validateBody(unlockGallerySchema, body);
    if (!validation.success) return validation.response;
    const { itemId } = validation.data;

    const item = await prisma.galleryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Gallery item not found" },
        { status: 404 }
      );
    }

    if (item.userId === userId) {
      return NextResponse.json(
        { error: "You already own this item" },
        { status: 400 }
      );
    }

    const existingUnlock = await prisma.galleryUnlock.findUnique({
      where: {
        userId_itemId: { userId, itemId },
      },
    });

    if (existingUnlock) {
      return NextResponse.json(
        { error: "Already unlocked" },
        { status: 400 }
      );
    }

    const buyer = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!buyer || buyer.coins < item.price) {
      return NextResponse.json(
        { error: "Insufficient coins" },
        { status: 403 }
      );
    }

    // Platform takes 35% fee
    const ownerAmount = Math.floor(item.price * (1 - PLATFORM_FEE));
    const earningHeldUntil = await getHeldUntilForSender(userId);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: item.price } },
      });

      await tx.user.update({
        where: { id: item.userId },
        data: { coins: { increment: ownerAmount } },
      });

      await tx.galleryUnlock.create({
        data: {
          userId,
          itemId,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: "GALLERY_UNLOCK",
          amount: -item.price,
          description: `Unlocked gallery item`,
        },
      });

      await tx.transaction.create({
        data: {
          userId: item.userId,
          type: "GALLERY_EARNING",
          amount: ownerAmount,
          description: `Gallery item unlocked by a user`,
          heldUntil: earningHeldUntil,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to unlock gallery item" },
      { status: 500 }
    );
  }
}
