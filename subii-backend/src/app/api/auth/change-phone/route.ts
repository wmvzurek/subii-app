import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const userId = await getUserFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: "Podaj numer telefonu" }, { status: 400 });
    }

    const cleaned = phone.replace(/[\s\-\+]/g, "");
    if (!/^[0-9]{9}$/.test(cleaned)) {
      return NextResponse.json({ error: "Numer telefonu musi mieć 9 cyfr" }, { status: 400 });
    }
    // Polskie numery zaczynają się od 4-9
    if (!/^[4-9]/.test(cleaned)) {
      return NextResponse.json({ error: "Podaj prawidłowy polski numer telefonu" }, { status: 400 });
    }
    // Blokuj numery składające się z jednej cyfry (np. 000000000, 111111111)
    if (/^(.)\1{8}$/.test(cleaned)) {
      return NextResponse.json({ error: "Podaj prawidłowy numer telefonu" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { phone: cleaned },
    });

    return NextResponse.json({ message: "Numer telefonu został zaktualizowany" });
  } catch (error) {
    console.error("[change-phone]", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}