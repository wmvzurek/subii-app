import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId, status: "active" },
      include: { plan: true }
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ error: "Brak aktywnych subskrypcji" }, { status: 400 });
    }

    const amount = subscriptions.reduce((sum, sub) => {
      return sum + (sub.priceOverridePLN || sub.plan.pricePLN);
    }, 0);

    const period = new Date().toISOString().slice(0, 7);

    const payment = await prisma.payment.create({
      data: {
        userId,
        period,
        amountPLN: amount,
        status: "SIMULATED_PAID",
        items: {
          create: subscriptions.map(sub => ({
            providerCode: sub.providerCode,
            planName: sub.plan.planName,
            pricePLN: sub.priceOverridePLN || sub.plan.pricePLN
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({
      id: payment.id,
      period: payment.period,
      amountPLN: payment.amountPLN,
      items: payment.items,
      createdAt: payment.createdAt,
    });
  } catch (error) {
    console.error("[POST /api/payments] error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payments = await prisma.payment.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return NextResponse.json({ payments });
}