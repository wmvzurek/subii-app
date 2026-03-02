import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const subscriptionId = parseInt(id);

  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "Subskrypcja nie znaleziona" },
      { status: 404 }
    );
  }

  const activeUntil = new Date(subscription.nextRenewalDate);
  activeUntil.setDate(activeUntil.getDate() - 1);
  activeUntil.setHours(23, 59, 59, 999);

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "pending_cancellation",
      activeUntil,
      cancelledAt: new Date(),
      pendingChargePLN: null,
    },
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
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const subscriptionId = parseInt(id);
  const body = await req.json();

  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
    include: { plan: true },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "Subskrypcja nie znaleziona" },
      { status: 404 }
    );
  }

  if (body.planId && body.planId !== subscription.planId) {
    const newPlan = await prisma.plan.findUnique({
      where: { id: body.planId },
    });

    if (!newPlan) {
      return NextResponse.json(
        { error: "Plan nie znaleziony" },
        { status: 404 }
      );
    }

    const oldPrice =
      subscription.priceOverridePLN || subscription.plan.pricePLN;
    const newPrice = newPlan.pricePLN;
    const isUpgrade = newPrice > oldPrice;

    let pendingChargePLN: number | null = null;

    if (isUpgrade) {
      const today = new Date();
      const nextRenewal = new Date(subscription.nextRenewalDate);
      const daysLeft = Math.max(
        1,
        Math.round(
          (nextRenewal.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );

      pendingChargePLN =
        Math.round(((newPrice - oldPrice) / 30) * daysLeft * 100) /
        100;
    }

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        pendingPlanId: body.planId,
        pendingChargePLN,
        status: "pending_change",
      },
      include: { plan: true, provider: true, pendingPlan: true },
    });

    return NextResponse.json(updated);
  }

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