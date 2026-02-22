import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();

  // Najpierw wykonaj dezaktywacje które już wygasły
  // Najpierw wykonaj dezaktywacje które już wygasły
// Dezaktywacje które już wygasły
// 1. Dezaktywuj subskrypcje które już wygasły
await prisma.subscription.updateMany({
  where: {
    userId,
    status: "pending_cancellation",
    activeUntil: { lte: today }
  },
  data: { status: "cancelled" }
});

// 2. Przełącz pending_change na nowy plan jeśli nextRenewalDate już minęła
const pendingChangeSubs = await prisma.subscription.findMany({
  where: {
    userId,
    status: "pending_change",
    pendingPlanId: { not: null },
    nextRenewalDate: { lte: today }
  },
  include: { pendingPlan: true }
});

for (const sub of pendingChangeSubs) {
  if (sub.pendingPlanId) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        planId: sub.pendingPlanId,
        providerCode: sub.pendingPlan!.providerCode,
        pendingPlanId: null,
        status: "active",
      }
    });
  }
}

// 3. Przesuń nextRenewalDate do przodu dla tych które minęły
const expiredRenewalSubs = await prisma.subscription.findMany({
  where: {
    userId,
    status: { in: ["active", "pending_change", "pending_cancellation"] },
    nextRenewalDate: { lte: today }
  },
  include: { plan: true }
});

for (const sub of expiredRenewalSubs) {
  const next = new Date(sub.nextRenewalDate);
  const cycle = sub.plan.cycle;
  // Przesuwaj dopóki data jest w przeszłości
  while (next <= today) {
    if (cycle === "yearly") {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
  }
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { nextRenewalDate: next }
  });
}

const subscriptions = await prisma.subscription.findMany({
  where: {
    userId,
    status: { in: ["active", "pending_change", "pending_cancellation"] }
  },
  include: {
    plan: true,
    provider: true,
    pendingPlan: true,
  },
  orderBy: { nextRenewalDate: "asc" },
});

  return NextResponse.json({ subscriptions });
}

export async function POST(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { planId, paymentOption, priceOverridePLN } = body;

  if (!planId) {
    return NextResponse.json(
      { error: "planId jest wymagane" },
      { status: 400 }
    );
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: "Plan nie znaleziony" }, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) return NextResponse.json({ error: "User nie znaleziony" }, { status: 404 });

  // Sprawdź czy to pierwsza subskrypcja
  const existingCount = await prisma.subscription.count({
    where: { userId, status: "active" }
  });

  const isFirst = existingCount === 0;

  // Jeśli pierwsza i nie ma billingDay – zwróć info że trzeba ustawić
  if (isFirst && !user.billingDay) {
    return NextResponse.json(
      { error: "BILLING_DAY_REQUIRED", message: "Ustaw dzień rozliczeniowy przed dodaniem subskrypcji" },
      { status: 422 }
    );
  }

  // Utwórz subskrypcję
  // Oblicz nextRenewalDate: dziś + 1 miesiąc (lub rok dla rocznych)
  const now = new Date();
  const nextRenewalDate = new Date(now);
  if (plan.cycle === "yearly") {
    nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);
  } else {
    nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
  }

  // Utwórz subskrypcję
  const subscription = await prisma.subscription.create({
    data: {
      userId,
      providerCode: plan.providerCode,
      planId,
      nextRenewalDate,
      priceOverridePLN: priceOverridePLN || null,
      status: "active",
    },
    include: { plan: true, provider: true },
  });

  // Jeśli paymentOption === "now" – pobierz pełną cenę z portfela
    // Płatność zostanie pobrana automatycznie w dniu rozliczeniowym
  // Jeśli "next_billing" – nic nie pobieramy teraz, Subii finansuje

  return NextResponse.json(subscription);
}