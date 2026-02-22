import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";
import { calculateBillingPreview } from "@/lib/billing";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const preview = await calculateBillingPreview(userId);

    if (!preview) {
      return NextResponse.json(
        { error: "Brak ustawionego dnia rozliczeniowego" },
        { status: 400 }
      );
    }

    if (preview.items.length === 0) {
      return NextResponse.json(
        { error: "Brak subskrypcji do rozliczenia" },
        { status: 400 }
      );
    }

    // Sprawdź czy billing na ten okres już istnieje
    const existing = await prisma.billingCycle.findUnique({
      where: {
        userId_period: {
          userId,
          period: preview.period,
        },
      },
    });

    if (existing?.status === "paid") {
      return NextResponse.json(
        { error: "Ten okres został już opłacony" },
        { status: 400 }
      );
    }

    // Wykonaj transakcję
    const result = await prisma.$transaction(async (tx) => {
      const billingCycle = await tx.billingCycle.upsert({
        where: {
          userId_period: {
            userId,
            period: preview.period,
          },
        },
        update: {
          status: "paid",
          totalPLN: preview.totalToPay,
        },
        create: {
          userId,
          period: preview.period,
          billingDate: preview.billingDate,
          totalPLN: preview.totalToPay,
          status: "paid",
        },
      });

      for (const item of preview.items) {
        await tx.billingCycleItem.create({
          data: {
            billingCycleId: billingCycle.id,
            subscriptionId: item.subscriptionId,
            providerCode: item.providerCode,
            planName: item.planName,
            pricePLN: item.pricePLN,
            periodFrom: item.periodFrom,
            periodTo: item.periodTo,
            creditApplied: 0,
          },
        });
      }

      await tx.subscription.updateMany({
        where: {
          userId,
          pendingChargePLN: { not: null },
        },
        data: {
          pendingChargePLN: null,
        },
      });

      return billingCycle;
    });

    return NextResponse.json({
      message: "Rozliczenie wykonane",
      billingCycleId: result.id,
      period: preview.period,
      totalPaid: preview.totalToPay,
    });
  } catch (error) {
    console.error("[POST /api/billing/pay] error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}