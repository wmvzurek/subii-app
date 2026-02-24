import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Podaj adres email" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Zawsze zwracamy sukces — nie zdradzamy czy email istnieje w bazie
    if (!user) {
      return NextResponse.json({
        message: "Jeśli konto istnieje, wyślemy link do resetowania hasła",
      });
    }

    const resetToken = generateToken({
      userId: user.id,
      email: user.email,
      type: "password_reset",
    });

    await sendPasswordResetEmail(user.email, user.firstName, resetToken);

    return NextResponse.json({
      message: "Jeśli konto istnieje, wyślemy link do resetowania hasła",
    });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}