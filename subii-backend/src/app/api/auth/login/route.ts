// src/app/api/auth/login/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyPassword, generateToken } from "@/lib/auth";

const prisma = new PrismaClient();
// Prosta mapa do rate limitingu w pamięci
// W produkcji z wieloma instancjami użyj Redis
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;        // max prób
const WINDOW_MS = 15 * 60 * 1000; // okno 15 minut
const BLOCK_MS = 15 * 60 * 1000;  // blokada 15 minut po przekroczeniu

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ip = req.headers.get("x-forwarded-for") 
      ?? req.headers.get("x-real-ip") 
      ?? "unknown";
    const key = `${ip}:${body.email || ""}`;
    const now = Date.now();

    // Sprawdź czy IP jest zablokowane
    const attempts = loginAttempts.get(key);
    if (attempts) {
      const timeSinceLast = now - attempts.lastAttempt;
      // Resetuj licznik jeśli okno minęło
      if (timeSinceLast > WINDOW_MS) {
        loginAttempts.delete(key);
      } else if (attempts.count >= MAX_ATTEMPTS) {
        const waitMinutes = Math.ceil((BLOCK_MS - timeSinceLast) / 60000);
        return NextResponse.json(
          { error: `Zbyt wiele prób logowania. Spróbuj ponownie za ${waitMinutes} minut.` },
          { status: 429 }
        );
      }
    }
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email i hasło są wymagane" },
        { status: 400 }
      );
    }

    // Znajdź użytkownika
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Nieprawidłowy email lub hasło" },
        { status: 401 }
      );
    }

    // Sprawdź hasło
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      // Zwiększ licznik nieudanych prób
      const current = loginAttempts.get(key) || { count: 0, lastAttempt: 0 };
      loginAttempts.set(key, { count: current.count + 1, lastAttempt: now });

      const remaining = MAX_ATTEMPTS - (current.count + 1);
      const message = remaining > 0
        ? `Nieprawidłowy email lub hasło. Pozostało prób: ${remaining}`
        : "Zbyt wiele nieudanych prób. Konto zablokowane na 15 minut.";

      return NextResponse.json({ error: message }, { status: 401 });
    }

    // Udane logowanie — resetuj licznik
    loginAttempts.delete(key);

    // Wygeneruj token
    const token = generateToken({ 
      userId: user.id, 
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    return NextResponse.json({
      message: "Logowanie udane",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        emailVerified: user.emailVerified, // ← DODAJ
      },
    });
  } catch (error) {
    console.error("[/api/auth/login] error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}