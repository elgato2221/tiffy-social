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

    const { followingId } = await req.json();

    if (!followingId) {
      return NextResponse.json(
        { error: "followingId is required" },
        { status: 400 }
      );
    }

    if (userId === followingId) {
      return NextResponse.json(
        { error: "You cannot follow yourself" },
        { status: 400 }
      );
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });
      return NextResponse.json({ followed: false });
    } else {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      await prisma.follow.create({
        data: {
          followerId: userId,
          followingId,
        },
      });

      await prisma.notification.create({
        data: {
          type: "FOLLOW",
          fromId: userId,
          fromName: user?.name || "Unknown",
          userId: followingId,
        },
      });

      return NextResponse.json({ followed: true });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to toggle follow" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (type === "followers") {
      const followers = await prisma.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              online: true,
            },
          },
        },
      });

      return NextResponse.json(followers.map((f) => f.follower));
    }

    if (type === "following") {
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              online: true,
            },
          },
        },
      });

      return NextResponse.json(following.map((f) => f.following));
    }

    // No type specified: return counts and isFollowing
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    const [followersCount, followingCount, isFollowingRecord] =
      await Promise.all([
        prisma.follow.count({
          where: { followingId: userId },
        }),
        prisma.follow.count({
          where: { followerId: userId },
        }),
        currentUserId
          ? prisma.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: currentUserId,
                  followingId: userId,
                },
              },
            })
          : null,
      ]);

    return NextResponse.json({
      followers: followersCount,
      following: followingCount,
      isFollowing: !!isFollowingRecord,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch follow data" },
      { status: 500 }
    );
  }
}
