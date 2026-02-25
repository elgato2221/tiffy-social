import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [deposits, totalRevenue] = await Promise.all([
      prisma.transaction.findMany({
        where: { type: "PURCHASE" },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              email: true,
            },
          },
        },
      }),
      prisma.transaction.aggregate({
        where: { type: "PURCHASE" },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      deposits,
      stats: {
        totalDeposits: totalRevenue._count,
        totalCoins: totalRevenue._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error("Admin deposits GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar depositos" },
      { status: 500 }
    );
  }
}
