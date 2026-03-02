import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.getDate();

  const tomorrowStart = new Date(tomorrow);
  tomorrowStart.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(23, 59, 59, 999);

  let totalSent = 0;

  const usersWithBillingTomorrow = await prisma.user.findMany({
    where: {
      billingDay: tomorrowDay,
      pushToken: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      pushToken: true,
      subscriptions: {
        where: {
          status: { in: ["active", "pending_change"] },
        },
        include: {
          plan: true,
          provider: true,
        },
      },
    },
  });

  for (const user of usersWithBillingTomorrow) {
    if (!user.pushToken) continue;
    if (user.subscriptions.length === 0) continue;

    const total = user.subscriptions.reduce((sum, sub) => {
      return sum + (sub.priceOverridePLN ?? sub.plan?.pricePLN ?? 0);
    }, 0);

    await sendPushNotification({
      pushToken: user.pushToken,
      title: "Płatność",
      body: `Jutro zostanie pobrana płatność za Twoje subskrypcje — łącznie ${total.toFixed(
        2
      )} zł`,
      data: { type: "billing_reminder" },
    });

    totalSent++;
  }

  const cancellingTomorrow = await prisma.subscription.findMany({
    where: {
      status: "pending_cancellation",
      activeUntil: {
        gte: tomorrowStart,
        lte: tomorrowEnd,
      },
    },
    include: {
      user: { select: { pushToken: true, firstName: true } },
      provider: { select: { name: true } },
    },
  });

  for (const sub of cancellingTomorrow) {
    if (!sub.user.pushToken) continue;

    await sendPushNotification({
      pushToken: sub.user.pushToken,
      title: "Wygaśnięcie dostępu",
      body: `Dostęp do ${sub.provider.name} wygaśnie jutro. Możesz reaktywować subskrypcję w aplikacji.`,
      data: { type: "cancellation_reminder", subscriptionId: sub.id },
    });

    totalSent++;
  }

  const changingTomorrow = await prisma.subscription.findMany({
    where: {
      status: "pending_change",
      nextRenewalDate: {
        gte: tomorrowStart,
        lte: tomorrowEnd,
      },
    },
    include: {
      user: { select: { pushToken: true, firstName: true } },
      provider: { select: { name: true } },
      pendingPlan: { select: { planName: true } },
    },
  });

  for (const sub of changingTomorrow) {
    if (!sub.user.pushToken) continue;

    const newPlanName = sub.pendingPlan?.planName || "nowy plan";

    await sendPushNotification({
      pushToken: sub.user.pushToken,
      title: "Zmiana planu",
      body: `Jutro w ${sub.provider.name} zacznie obowiązywać ${newPlanName}.`,
      data: { type: "plan_change_reminder", subscriptionId: sub.id },
    });

    totalSent++;
  }

  return NextResponse.json({
    ok: true,
    totalSent,
    billingReminders: usersWithBillingTomorrow.length,
    cancellationReminders: cancellingTomorrow.length,
    planChangeReminders: changingTomorrow.length,
  });
}