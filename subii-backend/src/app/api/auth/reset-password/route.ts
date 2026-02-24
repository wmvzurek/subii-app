import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken, hashPassword, verifyPassword } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Brak tokenu lub nowego hasła" }, { status: 400 });
    }

    // Weryfikuj token
    const payload = verifyToken(token);
    if (!payload || payload.type !== "password_reset") {
      return NextResponse.json({ error: "Link jest nieprawidłowy lub wygasł" }, { status: 400 });
    }

    // Walidacja hasła
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Hasło musi mieć min. 8 znaków" }, { status: 400 });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json({ error: "Hasło musi zawierać wielką literę" }, { status: 400 });
    }
    if (!/[a-z]/.test(newPassword)) {
      return NextResponse.json({ error: "Hasło musi zawierać małą literę" }, { status: 400 });
    }
    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json({ error: "Hasło musi zawierać cyfrę" }, { status: 400 });
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      return NextResponse.json({ error: "Hasło musi zawierać znak specjalny" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 });
    }

    // Sprawdź czy nowe hasło nie jest takie samo jak stare
    const isSamePassword = await verifyPassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        { error: "Nowe hasło musi być inne niż poprzednie" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: payload.userId },
      data: { 
        passwordHash,
        tokenVersion: { increment: 1 }, // unieważnij wszystkie stare tokeny
      },
    });

    return NextResponse.json({ message: "Hasło zostało zmienione. Możesz się teraz zalogować." });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}