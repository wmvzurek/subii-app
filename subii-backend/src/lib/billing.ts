import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type BillingPreviewItem = {
  subscriptionId: number;
  providerCode: string;
  providerName: string;
  planName: string;
  pricePLN: number;
  periodFrom: Date;
  periodTo: Date;
  pendingCharge: number;
  toPay: number;
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
 * Okno: od billingDay bieżącego miesiąca (lub następnego jeśli już minął)
 * do billingDay następnego miesiąca.
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
  // Sprawdź każdy miesiąc w oknie
  const start = new Date(windowStart);
  const end = new Date(windowEnd);
  
  // Sprawdź bieżący miesiąc okna
  let candidate = new Date(start.getFullYear(), start.getMonth(), renewalDay);
  
  while (candidate < end) {
    if (candidate >= start) {
      return candidate;
    }
    // Przejdź do następnego miesiąca
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
    where: { userId, status: "active" },
    include: { plan: true, provider: true }
  });
  
  const items: BillingPreviewItem[] = [];
  
  for (const sub of subscriptions) {
    // Sprawdź czy nextRenewalDate subskrypcji wypada w oknie rozliczeniowym
    const renewalDate = sub.nextRenewalDate;
    if (renewalDate < windowStart || renewalDate >= windowEnd) continue;
    
    const price = sub.priceOverridePLN || sub.plan.pricePLN;
    const periodFrom = renewalDate;
    const cycle = sub.plan.cycle;
    const periodTo = new Date(renewalDate);
    if (cycle === "yearly") {
      periodTo.setFullYear(periodTo.getFullYear() + 1);
    } else {
      periodTo.setMonth(periodTo.getMonth() + 1);
    }
    
    const pendingCharge = sub.pendingChargePLN || 0;

    items.push({
      subscriptionId: sub.id,
      providerCode: sub.providerCode,
      providerName: sub.provider.name,
      planName: sub.plan.planName,
      pricePLN: price,
      periodFrom,
      periodTo,
      pendingCharge,
      toPay: price + pendingCharge,
    });
  }
  
  const totalToPay = items.reduce((s, i) => s + i.pricePLN + i.pendingCharge, 0);
  
  const periodStart = `${windowStart.getFullYear()}-${String(windowStart.getMonth() + 1).padStart(2, '0')}-${String(windowStart.getDate()).padStart(2, '0')}`;
  const periodEnd = `${windowEnd.getFullYear()}-${String(windowEnd.getMonth() + 1).padStart(2, '0')}-${String(windowEnd.getDate()).padStart(2, '0')}`;
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
  const periodTo = new Date(today.getFullYear(), today.getMonth() + (today.getDate() <= renewalDay ? 0 : 1), renewalDay);
  
  if (periodTo <= today) {
    periodTo.setMonth(periodTo.getMonth() + 1);
  }
  
  const daysTotal = Math.round((periodTo.getTime() - new Date(today.getFullYear(), today.getMonth(), renewalDay > today.getDate() ? renewalDay - 30 : renewalDay).getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.round((periodTo.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Pełna cena miesięczna (bez proraty po stronie Subii)
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
  const daysRemaining = Math.max(1, Math.round((nextRenewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const daysInCycle = 30; // uproszczenie
  
  // Platforma naliczy różnicę za pozostałe dni
  const dailyDiff = (newPricePLN - oldPricePLN) / daysInCycle;
  const diffToPayNow = Math.round(dailyDiff * daysRemaining * 100) / 100;
  
  // Ile credit zostanie po zapłaceniu pełnego nowego planu
  const creditAfterUpgrade = Math.round((newPricePLN - diffToPayNow) * 100) / 100;
  
  return {
    diffToPayNow,
    creditAfterUpgrade,
    daysRemaining,
    daysInCycle,
  };
}