import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { adminUserActionSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
          role: true,
          status: true,
          verified: true,
          coins: true,
          isAnonymous: true,
          createdAt: true,
          bannedAt: true,
          banReason: true,
          _count: {
            select: {
              videos: true,
              followers: true,
              reports: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar usuarios" },
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
    const validation = validateBody(adminUserActionSchema, body);
    if (!validation.success) return validation.response;
    const { userId, action, role, reason } = validation.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: "Usuario nao encontrado" },
        { status: 404 }
      );
    }

    if (user.role === "ADMIN" && action !== "CHANGE_ROLE") {
      return NextResponse.json(
        { error: "Nao e possivel banir/suspender um admin" },
        { status: 400 }
      );
    }

    let auditAction = "";
    let updateData: Record<string, unknown> = {};

    switch (action) {
      case "BAN":
        updateData = {
          status: "BANNED",
          bannedAt: new Date(),
          banReason: reason || "Violacao dos termos de uso",
        };
        auditAction = "BAN_USER";
        break;
      case "SUSPEND":
        updateData = {
          status: "SUSPENDED",
          bannedAt: new Date(),
          banReason: reason || "Conta suspensa temporariamente",
        };
        auditAction = "SUSPEND_USER";
        break;
      case "ACTIVATE":
        updateData = {
          status: "ACTIVE",
          bannedAt: null,
          banReason: null,
        };
        auditAction = "ACTIVATE_USER";
        break;
      case "CHANGE_ROLE":
        if (!role) {
          return NextResponse.json(
            { error: "Role obrigatorio para esta acao" },
            { status: 400 }
          );
        }
        updateData = { role };
        auditAction = "CHANGE_ROLE";
        break;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: updateData,
      }),
      prisma.auditLog.create({
        data: {
          adminId: session.user.id,
          action: auditAction,
          targetType: "USER",
          targetId: userId,
          details: reason || `${action} por admin`,
        },
      }),
    ]);

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("Admin users POST error:", error);
    return NextResponse.json(
      { error: "Erro ao processar acao" },
      { status: 500 }
    );
  }
}
