import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { validateBody } from "@/lib/api-utils";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validation = validateBody(registerSchema, body);
    if (!validation.success) return validation.response;

    const { name, username, email, password, gender } = validation.data;

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Este email ja esta em uso." },
        { status: 409 }
      );
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: "Este nome de usuario ja esta em uso." },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification token (24h expiry)
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // All users start as USER with 100 coins
    const role = "USER";
    const coins = 100;

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
        gender,
        role,
        coins,
        emailVerificationToken,
        emailVerificationExpires,
      },
    });

    // Send verification email (non-blocking)
    sendVerificationEmail(email, emailVerificationToken).catch((err) => {
      console.error("Failed to send verification email:", err);
    });

    // Return user without password
    const { password: _, emailVerificationToken: _t, ...userWithoutSensitive } = user;

    return NextResponse.json(userWithoutSensitive, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar usuario:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { isAnonymous: false, verified: true, role: { not: "ADMIN" } },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        avatar: true,
        gender: true,
        role: true,
        online: true,
        verified: true,
        createdAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Erro ao listar usuarios:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
