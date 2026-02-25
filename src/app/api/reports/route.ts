import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createReportSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = validateBody(createReportSchema, body);
    if (!validation.success) return validation.response;
    const { reason, videoId, commentId } = validation.data;

    const report = await prisma.report.create({
      data: {
        userId: session.user.id,
        reason,
        videoId: videoId || null,
        commentId: commentId || null,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}
