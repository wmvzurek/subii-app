import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.cardLast4) {
    return NextResponse.json({ card: null });
  }

  return NextResponse.json({
    card: {
      brand: user.cardBrand,
      last4: user.cardLast4,
      expMonth: user.cardExpMonth,
      expYear: user.cardExpYear,
      paymentMethodId: user.stripePaymentMethodId,
    }
  });
}