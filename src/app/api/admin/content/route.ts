import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all"; // all, locked_media, audio, photo, video
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 30;
    const skip = (page - 1) * limit;

    // Build filter for messages with media content
    const typeFilter =
      type === "locked_media"
        ? { type: "locked_media" }
        : type === "audio"
        ? { type: "audio" }
        : { type: { in: ["locked_media", "audio"] } };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: typeFilter,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          sender: {
            select: { id: true, name: true, username: true, avatar: true },
          },
          receiver: {
            select: { id: true, name: true, username: true, avatar: true },
          },
        },
      }),
      prisma.message.count({ where: typeFilter }),
    ]);

    return NextResponse.json({
      messages,
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    console.error("Admin content error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar conteudo" },
      { status: 500 }
    );
  }
}
