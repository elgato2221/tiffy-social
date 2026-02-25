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
        updatedAt: true,
      },
    });

    // Calculate cooldown if last request was rejected
    let cooldownUntil: string | null = null;
    if (lastRequest?.status === "REJECTED") {
      const cooldownEnd = new Date(new Date(lastRequest.updatedAt).getTime() + 30 * 24 * 60 * 60 * 1000);
      if (cooldownEnd > new Date()) {
        cooldownUntil = cooldownEnd.toISOString();
      }
    }

    return NextResponse.json({
      verified: user?.verified || false,
      request: lastRequest,
      cooldownUntil,
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

    // 30-day cooldown after rejection
    const lastRejected = await prisma.verificationRequest.findFirst({
      where: { userId, status: "REJECTED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });

    if (lastRejected) {
      const cooldownEnd = new Date(lastRejected.updatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (cooldownEnd > new Date()) {
        const remainingDays = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return NextResponse.json(
          { error: `Aguarde ${remainingDays} dias para enviar nova verificacao.`, cooldownUntil: cooldownEnd.toISOString() },
          { status: 429 }
        );
      }
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
