import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest, generateToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const { newEmail } = await req.json();

    if (!newEmail) {
      return NextResponse.json({ error: "Podaj nowy adres e-mail" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: "Nieprawidłowy format adresu e-mail" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) {
      return NextResponse.json({ error: "Ten adres e-mail jest już zajęty" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        emailVerified: false,
      },
    });

    const token = generateToken({ userId, email: newEmail, type: "verification" });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    await sendVerificationEmail(newEmail, user?.firstName || "", token);

    return NextResponse.json({ message: "Email zaktualizowany, sprawdź skrzynkę" });
  } catch (error) {
    console.error("[change-email]", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}