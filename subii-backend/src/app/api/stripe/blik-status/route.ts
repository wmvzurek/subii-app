import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getUserFromRequest } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { paymentIntentId } = await req.json();

  if (!paymentIntentId) {
    return NextResponse.json({ error: "Brak paymentIntentId" }, { status: 400 });
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  return NextResponse.json({
    status: paymentIntent.status,
    // succeeded | requires_payment_method | requires_action | processing | canceled
  });
}