/**
 * Zwraca datę najbliższej płatności zbiorczej która obejmuje daną datę odnowienia.
 * Jeśli renewalDate nie podano — zwraca najbliższy billingDay.
 */
export function getNextBillingDateStr(
  billingDay: number | undefined,
  renewalDate?: string
): string {
  if (!billingDay) return "—";

  const today = new Date();

  if (renewalDate) {
    const renewal = new Date(renewalDate);
    let windowStart = new Date(today.getFullYear(), today.getMonth(), billingDay);
    if (windowStart <= today) {
      windowStart = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
    }

    for (let i = 0; i < 24; i++) {
      const windowEnd = new Date(
        windowStart.getFullYear(),
        windowStart.getMonth() + 1,
        billingDay - 1
      );
      windowEnd.setHours(23, 59, 59, 999);

      if (renewal >= windowStart && renewal <= windowEnd) {
        return windowStart.toLocaleDateString("pl-PL");
      }

      windowStart = new Date(
        windowStart.getFullYear(),
        windowStart.getMonth() + 1,
        billingDay
      );
    }
  }

  // Fallback — najbliższy billingDay
  const candidate = new Date(today.getFullYear(), today.getMonth(), billingDay);
  if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
  return candidate.toLocaleDateString("pl-PL");
}