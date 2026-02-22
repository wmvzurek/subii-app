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
await prisma.subscription.updateMany({
  where: {
    userId,
    status: "pending_cancellation",
    activeUntil: { lte: today }
  },
  data: { status: "cancelled" }
});

// Przełącz pending_change na nowy plan jeśli renewalDay już minął
const pendingChangeSubs = await prisma.subscription.findMany({
  where: {
    userId,
    status: "pending_change",
    pendingPlanId: { not: null }
  },
  include: { pendingPlan: true }
});

for (const sub of pendingChangeSubs) {
  // Oblicz datę ostatniego renewalu
  const lastRenewal = new Date(
    today.getFullYear(),
    today.getMonth(),
    sub.renewalDay
  );
  if (lastRenewal > today) {
    // renewalDay jeszcze nie minął w tym miesiącu – cofnij o miesiąc
    lastRenewal.setMonth(lastRenewal.getMonth() - 1);
  }

  // Jeśli dziś >= renewalDay tego miesiąca – czas przełączyć plan
  const thisMonthRenewal = new Date(
    today.getFullYear(),
    today.getMonth(),
    sub.renewalDay
  );

  if (today >= thisMonthRenewal && sub.pendingPlanId) {
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
    orderBy: { renewalDay: "asc" },
  });

  return NextResponse.json({ subscriptions });
}

export async function POST(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { planId, renewalDay, paymentOption, priceOverridePLN } = body;

  if (!planId || !renewalDay) {
    return NextResponse.json(
      { error: "planId i renewalDay są wymagane" },
      { status: 400 }
    );
  }

  if (renewalDay < 1 || renewalDay > 28) {
    return NextResponse.json(
      { error: "Dzień odnowienia musi być między 1 a 28" },
      { status: 400 }
    );
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: "Plan nie znaleziony" }, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true }
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
  const subscription = await prisma.subscription.create({
    data: {
      userId,
      providerCode: plan.providerCode,
      planId,
      renewalDay,
      priceOverridePLN: priceOverridePLN || null,
      status: "active",
    },
    include: { plan: true, provider: true },
  });

  // Jeśli paymentOption === "now" – pobierz pełną cenę z portfela
  if (paymentOption === "now") {
    const price = priceOverridePLN || plan.pricePLN;
    const wallet = user.wallet;

    if (wallet) {
      const newBalance = wallet.balance - price;
      await prisma.wallet.update({
        where: { userId },
        data: { balance: newBalance }
      });
    }
  }
  // Jeśli "next_billing" – nic nie pobieramy teraz, Subii finansuje

  return NextResponse.json(subscription);
}