import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        bio: true,
        avatar: true,
        gender: true,
        role: true,
        coins: true,
        messageCost: true,
        online: true,
        verified: true,
        createdAt: true,
        _count: {
          select: {
            videos: true,
            likes: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (session.user?.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validation = validateBody(updateProfileSchema, body);
    if (!validation.success) return validation.response;
    const { name, bio, avatar, messageCost } = validation.data;

    // Only verified users can set messageCost
    if (messageCost !== undefined) {
      const user = await prisma.user.findUnique({ where: { id }, select: { verified: true } });
      if (!user?.verified) {
        return NextResponse.json({ error: "Apenas usuarios verificados podem definir preco de mensagem" }, { status: 403 });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
        ...(messageCost !== undefined && { messageCost }),
      },
      select: {
        id: true,
        name: true,
        bio: true,
        avatar: true,
        messageCost: true,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
