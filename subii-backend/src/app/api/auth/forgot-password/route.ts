import { NextResponse } from "next/server";
import { generateToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const resetAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 3;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const now = Date.now();
    const attempts = resetAttempts.get(ip);

    if (attempts) {
      if (now - attempts.firstAttempt > WINDOW_MS) {
        resetAttempts.delete(ip);
      } else if (attempts.count >= MAX_ATTEMPTS) {
        const minutesLeft = Math.ceil(
          (WINDOW_MS - (now - attempts.firstAttempt)) / 60000
        );
        return NextResponse.json(
          { error: `Zbyt wiele prób. Spróbuj ponownie za ${minutesLeft} minut.` },
          { status: 429 }
        );
      }
    }

    if (resetAttempts.has(ip)) {
      resetAttempts.get(ip)!.count++;
    } else {
      resetAttempts.set(ip, { count: 1, firstAttempt: now });
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Podaj adres email" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

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