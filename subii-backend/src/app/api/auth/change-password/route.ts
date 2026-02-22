import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest, hashPassword } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const { newPassword } = await req.json();

    if (!newPassword) {
      return NextResponse.json({ error: "Podaj nowe hasło" }, { status: 400 });
    }

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
      data: { passwordHash: hashed },
    });

    return NextResponse.json({ message: "Hasło zostało zmienione" });
  } catch (error) {
    console.error("[change-password]", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}