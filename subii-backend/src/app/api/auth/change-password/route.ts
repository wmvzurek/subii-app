import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest, hashPassword, verifyPassword } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const userId = await getUserFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Podaj obecne i nowe hasło" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 });
    }

    // Weryfikuj obecne hasło
    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json({ error: "Obecne hasło jest nieprawidłowe" }, { status: 400 });
    }

    // Sprawdź czy nowe hasło różni się od obecnego
    const isSamePassword = await verifyPassword(newPassword, user.passwordHash);
    if (isSamePassword) {
      return NextResponse.json({ error: "Nowe hasło musi być inne niż obecne" }, { status: 400 });
    }

    // Walidacja nowego hasła
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

    const hashed = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashed,
        tokenVersion: { increment: 1 },
      },
    });

    return NextResponse.json({ message: "Hasło zostało zmienione" });
  } catch (error) {
    console.error("[change-password]", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}