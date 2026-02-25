import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(forgotPasswordSchema, body);
    if (!validation.success) return validation.response;
    const { email } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    });

    // Send email
    await sendPasswordResetEmail(user.email, token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Erro ao processar solicitacao" },
      { status: 500 }
    );
  }
}
