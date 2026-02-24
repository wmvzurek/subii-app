import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getUserFromRequest } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const prisma = new PrismaClient();

export async function POST(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paymentMethodId } = await req.json();

  // Odłącz starą kartę jeśli istnieje
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  const existingMethodId = (existingUser as Record<string, unknown>)?.stripePaymentMethodId as string | null;
  if (existingMethodId) {
    try {
     await stripe.paymentMethods.detach(existingMethodId);
    } catch {}
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  const card = paymentMethod.card;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripePaymentMethodId: paymentMethodId,
      cardBrand: card?.brand ?? null,
      cardLast4: card?.last4 ?? null,
      cardExpMonth: card?.exp_month ?? null,
      cardExpYear: card?.exp_year ?? null,
    },
  });

  return NextResponse.json({ success: true });
}