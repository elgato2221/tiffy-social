import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    const videos = await prisma.video.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            verified: true,
          },
        },
        likes: {
          select: { userId: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    return NextResponse.json(videos);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch user videos" },
      { status: 500 }
    );
  }
}
