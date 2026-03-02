import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();

  await prisma.subscription.updateMany({
    where: {
      userId,
      status: "pending_cancellation",
      activeUntil: { lte: today },
    },
    data: { status: "cancelled" },
  });

  const pendingChangeSubs = await prisma.subscription.findMany({
    where: {
      userId,
      status: "pending_change",
      pendingPlanId: { not: null },
      nextRenewalDate: { lte: today },
    },
    include: { pendingPlan: true },
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
        },
      });
    }
  }

  const expiredRenewalSubs = await prisma.subscription.findMany({
    where: {
      userId,
      status: { in: ["active", "pending_change", "pending_cancellation"] },
      nextRenewalDate: { lte: today },
    },
    include: { plan: true },
  });

  for (const sub of expiredRenewalSubs) {
    const next = new Date(sub.nextRenewalDate);
    const cycle = sub.plan.cycle;

    while (next <= today) {
      if (cycle === "yearly") {
        next.setFullYear(next.getFullYear() + 1);
      } else {
        next.setMonth(next.getMonth() + 1);
      }
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { nextRenewalDate: next },
    });
  }

  const subscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      status: { in: ["active", "pending_change", "pending_cancellation"] },
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
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { planId, priceOverridePLN } = body;

  if (priceOverridePLN !== undefined && priceOverridePLN !== null) {
    const price = Number(priceOverridePLN);
    if (isNaN(price) || price < 0 || price > 9999) {
      return NextResponse.json(
        { error: "Nieprawidłowa cena — musi być liczbą między 0 a 9999" },
        { status: 400 }
      );
    }
  }

  if (priceOverridePLN !== undefined && priceOverridePLN !== null) {
    const price = Number(priceOverridePLN);
    if (isNaN(price) || price < 0 || price > 9999) {
      return NextResponse.json(
        { error: "Nieprawidłowa cena — musi być liczbą między 0 a 9999" },
        { status: 400 }
      );
    }
  }

  if (!planId) {
    return NextResponse.json({ error: "planId jest wymagane" }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    return NextResponse.json({ error: "Plan nie znaleziony" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json({ error: "User nie znaleziony" }, { status: 404 });
  }

  const existingCount = await prisma.subscription.count({
    where: { userId, status: "active" },
  });

  const isFirst = existingCount === 0;

  if (isFirst && !user.billingDay) {
    return NextResponse.json(
      {
        error: "BILLING_DAY_REQUIRED",
        message: "Ustaw dzień rozliczeniowy przed dodaniem subskrypcji",
      },
      { status: 422 }
    );
  }

  const now = new Date();
  const nextRenewalDate = new Date(now);

  if (plan.cycle === "yearly") {
    nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);
  } else {
    nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      providerCode: plan.providerCode,
      planId,
      nextRenewalDate,
      priceOverridePLN: priceOverridePLN || null,
      status: "active",
      pendingChargePLN: null,
    },
    include: { plan: true, provider: true },
  });

  return NextResponse.json(subscription);
}