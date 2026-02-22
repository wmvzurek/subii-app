import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type BillingPreviewItem = {
  subscriptionId: number;
  providerCode: string;
  providerName: string;
  planName: string;
  pricePLN: number;
  renewalDay: number;
  periodFrom: Date;
  periodTo: Date;
  creditApplied: number;
  pendingCharge: number;  // ← DODAJ TO
  toPay: number;
};

export type BillingPreview = {
  billingDay: number;
  billingDate: Date;
  period: string;
  items: BillingPreviewItem[];
  totalBeforeCredit: number;
  creditUsed: number;
  totalToPay: number;
  walletBalance: number;
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
    // Billing jeszcze nie był w tym miesiącu
    windowStart = currentMonthBilling;
    windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
  } else {
    // Billing już był – liczymy następny
    windowStart = new Date(now.getFullYear(), now.getMonth() + 1, billingDay);
    windowEnd = new Date(now.getFullYear(), now.getMonth() + 2, billingDay);
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
    include: { wallet: true }
  });
  
  if (!user || !user.billingDay) return null;
  
  const { windowStart, windowEnd } = getBillingWindow(user.billingDay);
  
  const subscriptions = await prisma.subscription.findMany({
    where: { userId, status: "active" },
    include: { plan: true, provider: true }
  });
  
  const items: BillingPreviewItem[] = [];
  
  for (const sub of subscriptions) {
    const renewalDate = getRenewalInWindow(sub.renewalDay, windowStart, windowEnd);
    if (!renewalDate) continue;
    
    const price = sub.priceOverridePLN || sub.plan.pricePLN;
    const periodFrom = renewalDate;
    const periodTo = new Date(renewalDate.getFullYear(), renewalDate.getMonth() + 1, sub.renewalDay);
    
    const pendingCharge = sub.pendingChargePLN || 0;

items.push({
  subscriptionId: sub.id,
  providerCode: sub.providerCode,
  providerName: sub.provider.name,
  planName: sub.plan.planName,
  pricePLN: price,
  renewalDay: sub.renewalDay,
  periodFrom,
  periodTo,
  creditApplied: 0,
  pendingCharge,
  toPay: price + pendingCharge,  // ← cena + dopłata za upgrade
});
  }
  
  const walletBalance = user.wallet?.balance || 0;
  const totalBeforeCredit = items.reduce((s, i) => s + i.pricePLN + i.pendingCharge, 0);
  const creditUsed = Math.min(walletBalance, totalBeforeCredit);
  const totalToPay = Math.max(0, totalBeforeCredit - creditUsed);
  
  const period = `${windowStart.getFullYear()}-${String(windowStart.getMonth() + 1).padStart(2, '0')}`;
  
  return {
    billingDay: user.billingDay,
    billingDate: windowStart,
    period,
    items,
    totalBeforeCredit,
    creditUsed,
    totalToPay,
    walletBalance,
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
  renewalDay: number,
  today: Date = new Date()
): {
  diffToPayNow: number;
  creditAfterUpgrade: number;
  daysRemaining: number;
  daysInCycle: number;
} {
  // Następny renewal
  const nextRenewal = new Date(today.getFullYear(), today.getMonth() + (today.getDate() < renewalDay ? 0 : 1), renewalDay);
  if (nextRenewal <= today) {
    nextRenewal.setMonth(nextRenewal.getMonth() + 1);
  }
  
  const daysRemaining = Math.max(1, Math.round((nextRenewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
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