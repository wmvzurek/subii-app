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
  const today = new Date();
// activeUntil = następny renewalDay - 1 dzień
const nextRenewal = new Date(today.getFullYear(), today.getMonth(), subscription.renewalDay);
if (nextRenewal <= today) nextRenewal.setMonth(nextRenewal.getMonth() + 1);
const activeUntil = new Date(nextRenewal);
activeUntil.setDate(activeUntil.getDate() - 1);

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
  const oldPrice = subscription.priceOverridePLN || subscription.plan.pricePLN;
  const newPrice = newPlan.pricePLN;

  // Oblicz proporcjonalną dopłatę za dni od dziś do następnego odnowienia
  let pendingChargePLN: number | null = null;

  if (newPrice > oldPrice) {
    const { diffToPayNow } = calculateUpgradeCost(
      oldPrice,
      newPrice,
      subscription.renewalDay
    );
    if (diffToPayNow > 0) {
      pendingChargePLN = diffToPayNow;
    }
  }

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      planId: body.planId,
      providerCode: newPlan.providerCode,
      pendingPlanId: null,
      pendingChargePLN,   // ← zapisujemy dopłatę
      status: "active",
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