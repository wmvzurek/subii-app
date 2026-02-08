// src/app/api/subscriptions/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

// GET - pobierz subskrypcje zalogowanego usera
export async function GET(req: Request) {
  const userId = getUserFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    include: {
      plan: true,
      provider: true,
    },
    orderBy: { nextDueDate: "asc" },
  });

  return NextResponse.json({ subscriptions });
}

// POST - dodaj nową subskrypcję
export async function POST(req: Request) {
  const userId = getUserFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { planId, nextDueDate, priceOverridePLN } = body;

    if (!planId || !nextDueDate) {
      return NextResponse.json(
        { error: "planId i nextDueDate są wymagane" },
        { status: 400 }
      );
    }

    // Pobierz plan żeby dostać providerCode
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Plan nie znaleziony" }, { status: 404 });
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        providerCode: plan.providerCode,
        planId,
        nextDueDate: new Date(nextDueDate),
        priceOverridePLN: priceOverridePLN || null,
      },
      include: {
        plan: true,
        provider: true,
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("[POST /api/subscriptions] error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}