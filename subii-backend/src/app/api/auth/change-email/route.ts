import { NextResponse } from "next/server";
import { getUserFromRequest, generateToken, verifyPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const userId = await getUserFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const { newEmail, currentPassword } = await req.json();

    if (!newEmail) {
      return NextResponse.json({ error: "Podaj nowy adres e-mail" }, { status: 400 });
    }

    if (!currentPassword) {
      return NextResponse.json({ error: "Podaj obecne hasło aby zmienić email" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: "Nieprawidłowy format adresu e-mail" }, { status: 400 });
    }

    // Sprawdź obecne hasło
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 });
    }

    const isPasswordValid = await verifyPassword(currentPassword, currentUser.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Nieprawidłowe hasło" }, { status: 400 });
    }

    // Normalizacja emaila
    const normalizedEmail = newEmail.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Ten adres e-mail jest już zajęty" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: normalizedEmail,
        emailVerified: false,
      },
    });

    const token = generateToken({ userId, email: normalizedEmail, type: "verification" });
    const userForEmail = await prisma.user.findUnique({ where: { id: userId } });
    await sendVerificationEmail(normalizedEmail, userForEmail?.firstName || "", token);

    return NextResponse.json({ message: "Email zaktualizowany, sprawdź skrzynkę" });
  } catch (error) {
    console.error("[change-email]", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}