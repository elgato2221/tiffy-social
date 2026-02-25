import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(resetPasswordSchema, body);
    if (!validation.success) return validation.response;
    const { token, password } = validation.data;

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token invalido ou expirado" },
        { status: 400 }
      );
    }

    // Hash new password and clear reset token
    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Erro ao redefinir senha" },
      { status: 500 }
    );
  }
}
