import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params; // ← DODAJ await
  const subscriptionId = parseInt(id);

  // Sprawdź czy subskrypcja należy do usera
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "Subskrypcja nie znaleziona lub brak dostępu" },
      { status: 404 }
    );
  }

  await prisma.subscription.delete({
    where: { id: subscriptionId },
  });

  return NextResponse.json({ message: "Subskrypcja usunięta" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params; // ← DODAJ await
  const subscriptionId = parseInt(id);
  const body = await req.json();

  // Sprawdź własność
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, userId },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "Subskrypcja nie znaleziona" },
      { status: 404 }
    );
  }

  // Przygotuj dane do aktualizacji
  const updateData: {
    nextDueDate?: Date;
    status?: string;
    priceOverridePLN?: number | null;
    planId?: number;
    providerCode?: string;
  } = {};

  if (body.nextDueDate) {
    updateData.nextDueDate = new Date(body.nextDueDate);
  }

  if (body.status) {
    updateData.status = body.status;
  }

  if (body.priceOverridePLN !== undefined) {
    updateData.priceOverridePLN = body.priceOverridePLN;
  }

  // Jeśli zmienia się planId, pobierz nowy plan aby zaktualizować providerCode
  if (body.planId) {
    const newPlan = await prisma.plan.findUnique({ where: { id: body.planId } });
    if (newPlan) {
      updateData.planId = body.planId;
      updateData.providerCode = newPlan.providerCode;
    }
  }

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: updateData,
    include: {
      plan: true,
      provider: true,
    },
  });

  return NextResponse.json(updated);
}