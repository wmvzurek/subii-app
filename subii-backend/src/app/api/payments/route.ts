// src/app/api/payments/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

// POST - symulacja płatności za wszystkie subskrypcje usera
export async function POST(req: Request) {
  const userId = getUserFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Pobierz aktywne subskrypcje usera
    const subscriptions = await prisma.subscription.findMany({
      where: { 
        userId,
        status: "active"
      },
      include: { plan: true }
    });

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: "Brak aktywnych subskrypcji" },
        { status: 400 }
      );
    }

    // Oblicz sumę
    const amount = subscriptions.reduce((sum, sub) => {
      const price = sub.priceOverridePLN || sub.plan.pricePLN;
      return sum + price;
    }, 0);

    const period = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Stwórz płatność
    const payment = await prisma.payment.create({
      data: {
        userId,
        period,
        amountPLN: amount,
        status: "SIMULATED_PAID",
        items: {
          create: subscriptions.map(sub => ({
            providerCode: sub.providerCode,
            planName: sub.plan.planName,
            pricePLN: sub.priceOverridePLN || sub.plan.pricePLN
          })),
        },
      },
      include: { items: true },
    });

    // Aktualizuj nextDueDate dla każdej subskrypcji (+1 miesiąc)
    for (const sub of subscriptions) {
      const nextDate = new Date(sub.nextDueDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { nextDueDate: nextDate }
      });
    }

    return NextResponse.json({
      id: payment.id,
      period: payment.period,
      amountPLN: payment.amountPLN,
      items: payment.items,
      createdAt: payment.createdAt,
      message: "Płatność zrealizowana (symulacja). Daty płatności przesunięte o miesiąc."
    });
  } catch (error) {
    console.error("[POST /api/payments] error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

// GET - historia płatności usera
export async function GET(req: Request) {
  const userId = getUserFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payments = await prisma.payment.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return NextResponse.json({ payments });
}