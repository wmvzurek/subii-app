import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/notifications";

/**
 * GET /api/cron/billing-reminders
 * Wywołuj codziennie np. o 10:00 (cron job / Vercel Cron).
 * Wysyła push do użytkowników, których płatność wypada jutro.
 */
export async function GET(req: NextRequest) {
  // Zabezpieczenie — tylko wywołania z sekretnym kluczem
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  // Znajdź subskrypcje których nextRenewalDate wypada jutro
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: { in: ["active", "pending_change"] },
      nextRenewalDate: {
        gte: tomorrow,
        lt: dayAfter,
      },
    },
    include: {
      user: { select: { pushToken: true, firstName: true } },
      plan: { select: { pricePLN: true } },
      provider: { select: { name: true } },
    },
  });

  let sent = 0;

  for (const sub of subscriptions) {
    const pushToken = sub.user.pushToken;
    if (!pushToken) continue;

    const price = sub.priceOverridePLN ?? sub.plan.pricePLN;

    await sendPushNotification({
      pushToken,
      title: "Zbliża się płatność 💳",
      body: `Jutro zostanie pobrana opłata za ${sub.provider.name} — ${price.toFixed(2)} zł`,
      data: { subscriptionId: sub.id },
    });

    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
