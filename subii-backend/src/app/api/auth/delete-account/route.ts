import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest, verifyPassword } from "@/lib/auth";
import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const userId = await getUserFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: "Podaj hasło aby potwierdzić usunięcie konta" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 });
    }

    // Wymagaj potwierdzenia hasłem
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Nieprawidłowe hasło" }, { status: 400 });
    }

    // Odłącz kartę w Stripe jeśli istnieje
    const stripePaymentMethodId = user.stripePaymentMethodId;
    if (stripePaymentMethodId) {
      try {
        await stripe.paymentMethods.detach(stripePaymentMethodId);
      } catch {}
    }

    // Usuń customera w Stripe jeśli istnieje
    const stripeCustomerId = user.stripeCustomerId;
    if (stripeCustomerId) {
      try {
        await stripe.customers.del(stripeCustomerId);
      } catch {}
    }

    // Usuń usera — Prisma onDelete: Cascade usunie wszystko powiązane
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ message: "Konto zostało usunięte" });
  } catch (error) {
    console.error("[delete-account]", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}