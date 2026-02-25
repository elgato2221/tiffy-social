import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { adminVerificationSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requests = await prisma.verificationRequest.findMany({
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
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Admin verifications GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar verificacoes" },
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
    const validation = validateBody(adminVerificationSchema, body);
    if (!validation.success) return validation.response;
    const { requestId, action, reason } = validation.data;

    const request = await prisma.verificationRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Pedido nao encontrado" },
        { status: 404 }
      );
    }

    if (request.status !== "PENDING") {
      return NextResponse.json(
        { error: "Pedido ja foi processado" },
        { status: 400 }
      );
    }

    if (action === "APPROVE") {
      await prisma.$transaction([
        prisma.verificationRequest.update({
          where: { id: requestId },
          data: { status: "APPROVED" },
        }),
        prisma.user.update({
          where: { id: request.userId },
          data: { verified: true },
        }),
      ]);
    } else {
      await prisma.verificationRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reason: reason || "Selfie nao atende aos requisitos",
        },
      });
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("Admin verifications POST error:", error);
    return NextResponse.json(
      { error: "Erro ao processar verificacao" },
      { status: 500 }
    );
  }
}
