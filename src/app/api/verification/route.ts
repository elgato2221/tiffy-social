import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { verificationSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { verified: true },
    });

    const lastRequest = await prisma.verificationRequest.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        selfieUrl: true,
        status: true,
        reason: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      verified: user?.verified || false,
      request: lastRequest,
    });
  } catch (error) {
    console.error("Verification GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar verificacao" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { verified: true },
    });

    if (user?.verified) {
      return NextResponse.json(
        { error: "Perfil ja verificado" },
        { status: 400 }
      );
    }

    // Check for existing pending request
    const pending = await prisma.verificationRequest.findFirst({
      where: { userId, status: "PENDING" },
    });

    if (pending) {
      return NextResponse.json(
        { error: "Voce ja tem um pedido pendente. Aguarde a analise." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validation = validateBody(verificationSchema, body);
    if (!validation.success) return validation.response;
    const { selfieUrl } = validation.data;

    const request = await prisma.verificationRequest.create({
      data: {
        userId,
        selfieUrl,
      },
      select: {
        id: true,
        selfieUrl: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("Verification POST error:", error);
    return NextResponse.json(
      { error: "Erro ao enviar verificacao" },
      { status: 500 }
    );
  }
}
