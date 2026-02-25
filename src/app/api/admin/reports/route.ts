import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { adminReportActionSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "all";

    const where = statusFilter !== "all" ? { status: statusFilter } : {};

    const reports = await prisma.report.findMany({
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
          },
        },
        video: {
          select: {
            id: true,
            url: true,
            caption: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Admin reports GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar denuncias" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validation = validateBody(adminReportActionSchema, body);
    if (!validation.success) return validation.response;
    const { reportId, action } = validation.data;

    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Denuncia nao encontrada" },
        { status: 404 }
      );
    }

    if (report.status !== "PENDING") {
      return NextResponse.json(
        { error: "Denuncia ja foi processada" },
        { status: 400 }
      );
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    await prisma.$transaction([
      prisma.report.update({
        where: { id: reportId },
        data: { status: newStatus },
      }),
      prisma.auditLog.create({
        data: {
          adminId: session.user.id,
          action: "RESOLVE_REPORT",
          targetType: "REPORT",
          targetId: reportId,
          details: `Denuncia ${newStatus === "APPROVED" ? "aprovada" : "rejeitada"}`,
        },
      }),
    ]);

    return NextResponse.json({ success: true, action, status: newStatus });
  } catch (error) {
    console.error("Admin reports POST error:", error);
    return NextResponse.json(
      { error: "Erro ao processar denuncia" },
      { status: 500 }
    );
  }
}
