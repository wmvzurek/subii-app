import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getUserFromRequest } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amountPLN, paymentMethodType, paymentMethodId } = await req.json();

  // Walidacja kwoty
  if (!amountPLN || typeof amountPLN !== "number") {
    return NextResponse.json({ error: "Nieprawidłowa kwota" }, { status: 400 });
  }
  if (amountPLN <= 0) {
    return NextResponse.json({ error: "Kwota musi być większa niż 0" }, { status: 400 });
  }
  if (amountPLN > 5000) {
    return NextResponse.json({ error: "Kwota przekracza dozwolony limit" }, { status: 400 });
  }
  // Zaokrąglij do 2 miejsc po przecinku żeby uniknąć błędów float
  const safeAmount = Math.round(amountPLN * 100) / 100;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const stripeCustomerId = (user as Record<string, unknown>).stripeCustomerId as string | null;

  // Znajdź lub stwórz customera w Stripe
  let customerId = stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id } as Record<string, unknown>,
    });
  }

  // Ustal metody płatności
  const methodTypes: string[] = [];
  if (paymentMethodType === "blik") {
    methodTypes.push("blik");
  } else if (paymentMethodType === "google_pay") {
    methodTypes.push("card"); // Google Pay procesuje się jako karta
  } else {
    methodTypes.push("card");
  }

  const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
    amount: Math.round(safeAmount * 100),
    currency: "pln",
    customer: customerId,
    payment_method_types: methodTypes,
  };

  // Jeśli podano konkretną metodę płatności (zapisana karta)
  if (paymentMethodId) {
    paymentIntentParams.payment_method = paymentMethodId;
  }

  const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
}