import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { hashPassword, generateToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, username, dateOfBirth, phone } = body;

    if (!email || !password || !firstName || !lastName || !username || !dateOfBirth) {
      return NextResponse.json(
        { error: "Wszystkie pola są wymagane (oprócz telefonu)" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email lub nazwa użytkownika już istnieje" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        username,
        dateOfBirth: new Date(dateOfBirth),
        phone: phone || null,
      },
    });

    // Stwórz portfel dla nowego użytkownika
    await prisma.wallet.create({
      data: {
        userId: user.id,
        balance: 0,
      },
    });

    const token = generateToken({ userId: user.id, email: user.email });

    return NextResponse.json({
      message: "Rejestracja udana",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("[/api/auth/register] error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}