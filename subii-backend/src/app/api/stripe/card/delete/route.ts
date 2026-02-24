import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getUserFromRequest } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Sprawdź aktywne subskrypcje
  const activeSubscriptions = await prisma.subscription.findMany({
    where: {
      userId,
      status: { in: ["active", "pending_change", "pending_cancellation"] },
    },
    include: { provider: true },
  });

  if (activeSubscriptions.length > 0) {
    const names = activeSubscriptions.map((s) => s.provider.name).join(", ");
    return NextResponse.json({
      error: "HAS_ACTIVE_SUBSCRIPTIONS",
      message: `Masz aktywne subskrypcje: ${names}. Aby usunąć kartę, najpierw dodaj nową metodę płatności.`,
      count: activeSubscriptions.length,
    }, { status: 400 });
  }

  const stripePaymentMethodId = (user as Record<string, unknown>).stripePaymentMethodId as string | null;

  if (stripePaymentMethodId) {
    try {
      await stripe.paymentMethods.detach(stripePaymentMethodId);
    } catch {}
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripePaymentMethodId: null,
      cardBrand: null,
      cardLast4: null,
      cardExpMonth: null,
      cardExpYear: null,
    },
  });

  return NextResponse.json({ success: true });
}