import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest, generateToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const userId = getUserFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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