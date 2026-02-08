import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST() {
  const plans = await prisma.plan.findMany({ where: { country: "PL" } });
  const amount = plans.reduce((s, p) => s + p.pricePLN, 0);
  const period = new Date().toISOString().slice(0,7);

  const payment = await prisma.payment.create({
    data: {
      period,
      amountPLN: amount,
      status: "SIMULATED_PAID",
      items: {
        create: plans.map(p => ({
          providerCode: p.providerCode,
          planName: p.planName,
          pricePLN: p.pricePLN
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
}
