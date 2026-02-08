// src/app/api/subscriptions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = getUserFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptionId = parseInt(params.id);

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
  { params }: { params: { id: string } }
) {
  const userId = getUserFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptionId = parseInt(params.id);
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

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : undefined,
      status: body.status || undefined,
      priceOverridePLN: body.priceOverridePLN !== undefined ? body.priceOverridePLN : undefined,
    },
    include: {
      plan: true,
      provider: true,
    },
  });

  return NextResponse.json(updated);
}
