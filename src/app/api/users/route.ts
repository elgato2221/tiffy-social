import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, username, email, password, gender } = body;

    // Validate required fields
    if (!name || !username || !email || !password || !gender) {
      return NextResponse.json(
        { error: "Todos os campos sao obrigatorios." },
        { status: 400 }
      );
    }

    // Validate gender value
    if (!["MALE", "FEMALE"].includes(gender)) {
      return NextResponse.json(
        { error: "Genero invalido." },
        { status: 400 }
      );
    }

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

    // Determine role and coins based on gender
    const isFemale = gender === "FEMALE";
    const role = isFemale ? "CREATOR" : "USER";
    const coins = isFemale ? 200 : 100;

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
      },
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 201 });
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
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        bio: true,
        avatar: true,
        gender: true,
        role: true,
        coins: true,
        online: true,
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
