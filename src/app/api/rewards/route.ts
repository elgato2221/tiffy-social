import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

function stripTime(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return stripTime(date) === stripTime(yesterday);
}

function calculateReward(streak: number): number {
  return Math.min(10 + streak * 5, 50);
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      loginStreak: true,
      lastRewardAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const today = stripTime(new Date());
  const canClaim =
    !user.lastRewardAt || stripTime(user.lastRewardAt) < today;

  const streak = user.loginStreak ?? 0;
  const amount = calculateReward(streak);

  return NextResponse.json({
    loginStreak: streak,
    lastRewardAt: user.lastRewardAt,
    canClaim,
    amount,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      coins: true,
      loginStreak: true,
      lastRewardAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const today = stripTime(new Date());
  const canClaim =
    !user.lastRewardAt || stripTime(user.lastRewardAt) < today;

  if (!canClaim) {
    return NextResponse.json(
      { error: "Already claimed today" },
      { status: 400 }
    );
  }

  // Calculate streak: if last reward was yesterday, increment; otherwise reset to 1
  let streak: number;
  if (user.lastRewardAt && isYesterday(user.lastRewardAt)) {
    streak = (user.loginStreak ?? 0) + 1;
  } else {
    streak = 1;
  }

  const amount = calculateReward(streak);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        coins: { increment: amount },
        loginStreak: streak,
        lastRewardAt: now,
      },
      select: {
        coins: true,
      },
    });

    await tx.dailyReward.create({
      data: {
        userId: user.id,
        amount,
        streak,
      },
    });

    await tx.transaction.create({
      data: {
        userId: user.id,
        type: "DAILY_REWARD",
        amount,
        description: `Daily reward (streak: ${streak})`,
      },
    });

    return updatedUser;
  });

  return NextResponse.json({
    amount,
    streak,
    coins: result.coins,
  });
}
