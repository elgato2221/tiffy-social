import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST() {
  try {
    const id = crypto.randomBytes(4).toString("hex");
    const username = `Anon_${id}`;
    const email = `anon_${id}@anon.tiffy`;
    const rawPassword = crypto.randomBytes(12).toString("hex");
    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    const user = await prisma.user.create({
      data: {
        name: "Anonimo",
        username,
        email,
        password: hashedPassword,
        gender: "OTHER",
        role: "USER",
        coins: 0,
        isAnonymous: true,
      },
    });

    return NextResponse.json({
      email,
      password: rawPassword,
      userId: user.id,
    }, { status: 201 });
  } catch (error) {
    console.error("Anonymous registration error:", error);
    return NextResponse.json({ error: "Erro ao criar conta anonima" }, { status: 500 });
  }
}
