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

  const activeUntil = new Date(subscription.nextRenewalDate);
  activeUntil.setDate(activeUntil.getDate() - 1);
  activeUntil.setHours(23, 59, 59, 999);

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

  // Zmiana planu → zawsze pending_change, wchodzi przy następnym odnowieniu
  if (body.planId && body.planId !== subscription.planId) {
    const newPlan = await prisma.plan.findUnique({ where: { id: body.planId } });
    if (!newPlan) return NextResponse.json({ error: "Plan nie znaleziony" }, { status: 404 });

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        pendingPlanId: body.planId,
        pendingChargePLN: null,
        status: "pending_change",
      },
      include: { plan: true, provider: true, pendingPlan: true },
    });

    return NextResponse.json(updated);
  }

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

  // Inne aktualizacje (np. priceOverridePLN)
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