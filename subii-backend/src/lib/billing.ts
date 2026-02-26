import { prisma } from "@/lib/prisma";

export type BillingPreviewItem = {
  subscriptionId: number;
  providerCode: string;
  providerName: string;
  planName: string;
  pendingPlanName?: string;
  pricePLN: number;
  periodFrom: Date;
  periodTo: Date;
  pendingCharge: number;
  toPay: number;
  chargeType: "renewal" | "upgrade_addon";
};

export type BillingPreview = {
  billingDay: number;
  billingDate: Date;
  period: string;
  items: BillingPreviewItem[];
  totalToPay: number;
};

/**
 * Oblicza okno rozliczeniowe i które renewale w nim wypadają.
 */
export function getBillingWindow(billingDay: number, referenceDate: Date = new Date()) {
  const now = new Date(referenceDate);
  const currentMonthBilling = new Date(now.getFullYear(), now.getMonth(), billingDay);

  let windowStart: Date;
  let windowEnd: Date;

  if (now <= currentMonthBilling) {
    windowStart = currentMonthBilling;
    windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, billingDay - 1);
    windowEnd.setHours(23, 59, 59, 999);
  } else {
    windowStart = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
    windowEnd = new Date(now.getFullYear(), now.getMonth() + 2, billingDay - 1);
    windowEnd.setHours(23, 59, 59, 999);
  }

  return { windowStart, windowEnd };
}

/**
 * Dla danej subskrypcji oblicza datę jej renewalu w oknie rozliczeniowym.
 */
export function getRenewalInWindow(
  renewalDay: number,
  windowStart: Date,
  windowEnd: Date
): Date | null {
  const start = new Date(windowStart);
  const end = new Date(windowEnd);

  let candidate = new Date(start.getFullYear(), start.getMonth(), renewalDay);

  while (candidate < end) {
    if (candidate >= start) {
      return candidate;
    }
    candidate = new Date(candidate.getFullYear(), candidate.getMonth() + 1, renewalDay);
  }

  return null;
}

/**
 * Główna funkcja – generuje podgląd następnej płatności zbiorczej.
 */
export async function calculateBillingPreview(userId: number): Promise<BillingPreview | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.billingDay) return null;

  const { windowStart, windowEnd } = getBillingWindow(user.billingDay);

  const subscriptions = await prisma.subscription.findMany({
    where: { userId, status: { in: ["active", "pending_change", "pending_cancellation"] } },
    include: { plan: true, provider: true, pendingPlan: true },
    orderBy: { createdAt: "asc" },
  });

  const items: BillingPreviewItem[] = [];

  for (const sub of subscriptions) {

    // ── ANULOWANE ──
    if (sub.status === "pending_cancellation") {
      const activeUntil = sub.activeUntil ? new Date(sub.activeUntil) : null;
      const renewalDate = new Date(sub.nextRenewalDate);

      if (activeUntil && activeUntil >= renewalDate) {
        if (renewalDate >= windowStart && renewalDate < windowEnd) {
          const price = sub.priceOverridePLN || sub.plan.pricePLN;
          const cycle = sub.plan.cycle;
          const periodTo = new Date(renewalDate);
          if (cycle === "yearly") {
            periodTo.setFullYear(periodTo.getFullYear() + 1);
          } else {
            periodTo.setMonth(periodTo.getMonth() + 1);
          }
          items.push({
            subscriptionId: sub.id,
            providerCode: sub.providerCode,
            providerName: sub.provider.name,
            planName: sub.plan.planName,
            pricePLN: price,
            periodFrom: renewalDate,
            periodTo,
            pendingCharge: 0,
            toPay: price,
            chargeType: "renewal",
          });
        }
      }
      continue;
    }

    // ── AKTYWNE / PENDING_CHANGE ──
    const renewalDate = new Date(sub.nextRenewalDate);
    if (renewalDate < windowStart || renewalDate >= windowEnd) continue;

    const effectivePlan = (sub.status === "pending_change" && sub.pendingPlan)
      ? sub.pendingPlan
      : sub.plan;
    const price = sub.priceOverridePLN || effectivePlan.pricePLN;
    const cycle = effectivePlan.cycle;
    const periodTo = new Date(renewalDate);
    if (cycle === "yearly") {
      periodTo.setFullYear(periodTo.getFullYear() + 1);
    } else {
      periodTo.setMonth(periodTo.getMonth() + 1);
    }

    const pendingCharge = sub.pendingChargePLN || 0;
    const chargeType = pendingCharge > 0 ? "upgrade_addon" : "renewal";
    items.push({
      subscriptionId: sub.id,
      providerCode: sub.providerCode,
      providerName: sub.provider.name,
      planName: sub.plan.planName,
      pendingPlanName: sub.pendingPlan?.planName ?? undefined,
      pricePLN: price,
      periodFrom: renewalDate,
      periodTo,
      pendingCharge,
      toPay: price + pendingCharge,
      chargeType,
    });
  }

  const totalToPay = items.reduce((s, i) => s + i.toPay, 0);

  const periodStart = `${windowStart.getFullYear()}-${String(windowStart.getMonth() + 1).padStart(2, "0")}-${String(windowStart.getDate()).padStart(2, "0")}`;
  const periodEnd = `${windowEnd.getFullYear()}-${String(windowEnd.getMonth() + 1).padStart(2, "0")}-${String(windowEnd.getDate()).padStart(2, "0")}`;
  const period = `${periodStart}_${periodEnd}`;

  return {
    billingDay: user.billingDay,
    billingDate: windowStart,
    period,
    items,
    totalToPay,
  };
}

/**
 * Oblicza koszt dodania nowej subskrypcji opcją "teraz".
 */
export function calculateImmediateCost(
  pricePLN: number,
  renewalDay: number,
  today: Date = new Date()
): { amountDue: number; periodFrom: Date; periodTo: Date } {
  const periodFrom = new Date(today);
  const periodTo = new Date(
    today.getFullYear(),
    today.getMonth() + (today.getDate() <= renewalDay ? 0 : 1),
    renewalDay
  );

  if (periodTo <= today) {
    periodTo.setMonth(periodTo.getMonth() + 1);
  }

  return {
    amountDue: pricePLN,
    periodFrom,
    periodTo,
  };
}

/**
 * Oblicza koszt upgrade'u planu.
 */
export function calculateUpgradeCost(
  oldPricePLN: number,
  newPricePLN: number,
  nextRenewalDate: Date,
  today: Date = new Date()
): {
  diffToPayNow: number;
  creditAfterUpgrade: number;
  daysRemaining: number;
  daysInCycle: number;
} {
  const daysRemaining = Math.max(
    1,
    Math.round((nextRenewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );
  const daysInCycle = 30;

  const dailyDiff = (newPricePLN - oldPricePLN) / daysInCycle;
  const diffToPayNow = Math.round(dailyDiff * daysRemaining * 100) / 100;
  const creditAfterUpgrade = Math.round((newPricePLN - diffToPayNow) * 100) / 100;

  return {
    diffToPayNow,
    creditAfterUpgrade,
    daysRemaining,
    daysInCycle,
  };
}