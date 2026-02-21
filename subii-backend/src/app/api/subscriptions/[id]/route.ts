import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";
import { calculateUpgradeCost } from "@/lib/billing";

const prisma = new PrismaClient();

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const subscriptionId = parseInt(id);

  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
  });

  if (!subscription) {
    return NextResponse.json({ error: "Subskrypcja nie znaleziona" }, { status: 404 });
  }

  // Oblicz activeUntil – do końca bieżącego okresu (następny billing day)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const billingDay = user?.billingDay || 1;
  const today = new Date();
  const activeUntil = new Date(today.getFullYear(), today.getMonth(), billingDay);
  if (activeUntil <= today) activeUntil.setMonth(activeUntil.getMonth() + 1);

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "pending_cancellation",
      activeUntil,
      cancelledAt: new Date(),
    }
  });

  return NextResponse.json({
    message: "Subskrypcja zostanie dezaktywowana",
    activeUntil,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const subscriptionId = parseInt(id);
  const body = await req.json();

  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
    include: { plan: true }
  });

  if (!subscription) {
    return NextResponse.json({ error: "Subskrypcja nie znaleziona" }, { status: 404 });
  }

  // Zmiana planu
  if (body.planId && body.planId !== subscription.planId) {
    const newPlan = await prisma.plan.findUnique({ where: { id: body.planId } });
    if (!newPlan) return NextResponse.json({ error: "Plan nie znaleziony" }, { status: 404 });

    if (body.upgradeOption === "now") {
      // Zmień od razu
      const oldPrice = subscription.priceOverridePLN || subscription.plan.pricePLN;
      const newPrice = newPlan.pricePLN;

      const updated = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          planId: body.planId,
          providerCode: newPlan.providerCode,
          pendingPlanId: null,
          status: "active",
        },
        include: { plan: true, provider: true },
      });

      // Jeśli upgrade – dodaj credit
      if (newPrice > oldPrice) {
        const { creditAfterUpgrade } = calculateUpgradeCost(oldPrice, newPrice, subscription.renewalDay);
        if (creditAfterUpgrade > 0) {
          const wallet = await prisma.wallet.findUnique({ where: { userId } });
          if (wallet) {
            await prisma.wallet.update({
              where: { userId },
              data: { balance: wallet.balance + creditAfterUpgrade }
            });
          }
        }
      }

      return NextResponse.json(updated);
    } else {
      // Zmień przy następnej płatności – ustaw pending_change
      const updated = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          pendingPlanId: body.planId,
          status: "pending_change",
        },
        include: { plan: true, provider: true },
      });

      return NextResponse.json(updated);
    }
  }

  // Inne aktualizacje
  // Reaktywacja
  if (body.status === "active") {
    const reactivated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "active",
        activeUntil: null,
        cancelledAt: null,
      },
      include: { plan: true, provider: true },
    });
    return NextResponse.json(reactivated);
  }

  // Inne aktualizacje
  const updateData: {
    planId?: number;
    providerCode?: string;
    priceOverridePLN?: number | null;
  } = {};

  if (body.priceOverridePLN !== undefined) {
    updateData.priceOverridePLN = body.priceOverridePLN;
  }

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: updateData,
    include: { plan: true, provider: true },
  });

  return NextResponse.json(updated);
}