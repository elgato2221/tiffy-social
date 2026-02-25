import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createVideoSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";

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

    // Check verification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { verified: true },
    });

    if (!user?.verified) {
      return NextResponse.json(
        { error: "Verifique seu perfil para publicar videos" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = validateBody(createVideoSchema, body);
    if (!validation.success) return validation.response;
    const { url, caption } = validation.data;

    const video = await prisma.video.create({
      data: {
        url,
        caption: caption || null,
        userId,
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
      },
    });

    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Erro ao criar video" },
      { status: 500 }
    );
  }
}
