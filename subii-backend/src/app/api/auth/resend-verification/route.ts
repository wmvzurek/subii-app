import { NextResponse } from "next/server";
import { getUserFromRequest, generateToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

import { prisma } from "@/lib/prisma";

// Max 3 próby na godzinę per userId
const resendAttempts = new Map<number, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 3;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  const userId = await getUserFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  const now = Date.now();
  const attempts = resendAttempts.get(userId);
  if (attempts) {
    if (now - attempts.firstAttempt > WINDOW_MS) {
      resendAttempts.delete(userId);
    } else if (attempts.count >= MAX_ATTEMPTS) {
      const minutesLeft = Math.ceil((WINDOW_MS - (now - attempts.firstAttempt)) / 60000);
      return NextResponse.json(
        { error: `Zbyt wiele prób. Spróbuj ponownie za ${minutesLeft} minut.` },
        { status: 429 }
      );
    }
  }
  if (resendAttempts.has(userId)) {
    resendAttempts.get(userId)!.count++;
  } else {
    resendAttempts.set(userId, { count: 1, firstAttempt: now });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email już zweryfikowany" },
        { status: 400 }
      );
    }

    const verificationToken = generateToken({
      userId: user.id,
      email: user.email,
      type: 'verification'
    });

    await sendVerificationEmail(user.email, user.firstName, verificationToken);

    return NextResponse.json({
      message: "Email weryfikacyjny został ponownie wysłany"
    });
  } catch (error) {
    console.error("[/api/auth/resend-verification] error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}