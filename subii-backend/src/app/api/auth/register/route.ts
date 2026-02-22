import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { hashPassword, generateToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  console.log("🔵 [REGISTER] Rozpoczęcie rejestracji");
  
  try {
    const body = await req.json();
    console.log("🔵 [REGISTER] Otrzymane dane:", { 
      email: body.email, 
      firstName: body.firstName,
      hasPassword: !!body.password,
      hasPhone: !!body.phone,
      hasDateOfBirth: !!body.dateOfBirth
    });
    
    const { email, password, firstName, lastName, phone, dateOfBirth } = body;

    if (!email || !password || !firstName || !lastName || !phone || !dateOfBirth) {
      console.log("❌ [REGISTER] Brak wymaganych pól");
      return NextResponse.json(
        { error: "Wszystkie pola są wymagane" },
        { status: 400 }
      );
    }


    // Walidacja emaila
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Nieprawidłowy format emaila" },
        { status: 400 }
      );
    }

     // Walidacja telefonu
    const phoneRegex = /^[0-9]{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: "Numer telefonu musi mieć 9 cyfr" },
        { status: 400 }
      );
    }

    // Walidacja hasła
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Hasło musi mieć min. 8 znaków" },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: "Hasło musi zawierać wielką literę" },
        { status: 400 }
      );
    }

    if (!/[a-z]/.test(password)) {
      return NextResponse.json(
        { error: "Hasło musi zawierać małą literę" },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Hasło musi zawierać cyfrę" },
        { status: 400 }
      );
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return NextResponse.json(
        { error: "Hasło musi zawierać znak specjalny (!@#$%^&*...)" },
        { status: 400 }
      );
    }

    // Walidacja wieku (minimum 13 lat)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      actualAge = age - 1;
    }

    if (actualAge < 13) {
      return NextResponse.json(
        { error: "Musisz mieć minimum 13 lat, aby się zarejestrować" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email już istnieje w systemie" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        phone,
        emailVerified: false,
      },
    });


    const token = generateToken({ userId: user.id, email: user.email });
    const verificationToken = generateToken({ 
      userId: user.id, 
      email: user.email,
      type: 'verification'
    });

    // Wyślij email weryfikacyjny (nie blokuj rejestracji jeśli się nie powiedzie)
    await sendVerificationEmail(email, firstName, verificationToken);

    return NextResponse.json({
      message: "Konto utworzone. Sprawdź swoją skrzynkę email aby potwierdzić adres.",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error("[/api/auth/register] error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}