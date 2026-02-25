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

    const [
      totalUsers,
      totalVideos,
      totalReports,
      pendingReports,
      totalWithdrawals,
      pendingWithdrawals,
      pendingVerifications,
      totalMessages,
      bannedUsers,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.video.count(),
      prisma.report.count(),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.withdrawalRequest.count(),
      prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
      prisma.verificationRequest.count({ where: { status: "PENDING" } }),
      prisma.message.count(),
      prisma.user.count({ where: { status: "BANNED" } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalVideos,
      totalReports,
      pendingReports,
      totalWithdrawals,
      pendingWithdrawals,
      pendingVerifications,
      totalMessages,
      bannedUsers,
      recentUsers,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatisticas" },
      { status: 500 }
    );
  }
}
