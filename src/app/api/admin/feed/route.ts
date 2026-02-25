import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { adminFeedActionSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";

// GET: List feed videos (pending and history)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "PENDING";

    const where =
      statusFilter === "all"
        ? { destination: "FEED" }
        : { destination: "FEED", status: statusFilter };

    const videos = await prisma.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
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
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    return NextResponse.json(videos);
  } catch (error) {
    console.error("Admin feed GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar videos do feed" },
      { status: 500 }
    );
  }
}

// POST: Approve or reject a feed video
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validation = validateBody(adminFeedActionSchema, body);
    if (!validation.success) return validation.response;
    const { videoId, action, reason } = validation.data;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json(
        { error: "Video nao encontrado" },
        { status: 404 }
      );
    }

    if (video.status !== "PENDING") {
      return NextResponse.json(
        { error: "Video ja foi processado" },
        { status: 400 }
      );
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    await prisma.$transaction(async (tx) => {
      await tx.video.update({
        where: { id: videoId },
        data: {
          status: newStatus,
          rejectReason: action === "REJECT" ? reason || null : null,
          reviewedAt: new Date(),
          reviewedBy: session.user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          adminId: session.user.id,
          action: action === "APPROVE" ? "APPROVE_VIDEO" : "REJECT_VIDEO",
          targetType: "VIDEO",
          targetId: videoId,
          details:
            reason ||
            `Video ${newStatus === "APPROVED" ? "aprovado" : "rejeitado"} para o feed`,
        },
      });
    });

    return NextResponse.json({ success: true, action, status: newStatus });
  } catch (error) {
    console.error("Admin feed POST error:", error);
    return NextResponse.json(
      { error: "Erro ao processar video" },
      { status: 500 }
    );
  }
}
