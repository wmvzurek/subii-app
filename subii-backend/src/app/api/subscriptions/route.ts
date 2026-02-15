// src/app/api/subscriptions/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

// GET - pobierz subskrypcje zalogowanego usera
export async function GET(req: Request) {
  const userId = getUserFromRequest(req);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📥 GET /api/subscriptions");
  console.log("   User ID from token:", userId);

  if (!userId) {
    console.log("❌ No userId - returning 401");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pobierz WSZYSTKIE subskrypcje (pending, active, cancelled)
  const subscriptions = await prisma.subscription.findMany({
    where: { 
      userId,
      status: { in: ["pending", "active"] } // Nie pokazuj tylko cancelled
    },
    include: {
      plan: true,
      provider: true,
    },
    orderBy: { nextDueDate: "asc" },
  });

  // Automatycznie zaktualizuj statusy na podstawie dat
  const today = new Date();
  const updatedSubscriptions = [];

  for (const sub of subscriptions) {
    let newStatus = sub.status;
    const nextDue = new Date(sub.nextDueDate);

    // Jeśli data płatności jest w przyszłości → pending
    if (nextDue > today && sub.status === "pending") {
      newStatus = "pending";
    }
    // Jeśli data płatności minęła i jest active → może być expired
    else if (nextDue <= today && sub.status === "pending") {
      // Aktywuj subskrypcję jeśli data nadeszła
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { 
          status: "active",
          activatedAt: new Date()
        }
      });
      newStatus = "active";
    }

    updatedSubscriptions.push({
      ...sub,
      status: newStatus
    });
  }

  console.log("📊 Found", updatedSubscriptions.length, "subscriptions");
  updatedSubscriptions.forEach((sub, i) => {
    console.log(`   ${i+1}. ${sub.provider.name} - ${sub.plan.planName}`);
    console.log(`      Status: ${sub.status}, Next due: ${sub.nextDueDate}`);
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return NextResponse.json({ subscriptions: updatedSubscriptions });
}

// POST - dodaj nową subskrypcję
export async function POST(req: Request) {
  const userId = getUserFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { planId, nextDueDate, priceOverridePLN } = body;

    if (!planId || !nextDueDate) {
      return NextResponse.json(
        { error: "planId i nextDueDate są wymagane" },
        { status: 400 }
      );
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Plan nie znaleziony" }, { status: 404 });
    }

    const dueDate = new Date(nextDueDate);
    const today = new Date();
    
    // Automatycznie ustaw status na podstawie daty
    const status = dueDate <= today ? "active" : "pending";
    const activatedAt = dueDate <= today ? new Date() : null;

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        providerCode: plan.providerCode,
        planId,
        nextDueDate: dueDate,
        priceOverridePLN: priceOverridePLN || null,
        status,
        activatedAt,
      },
      include: {
        plan: true,
        provider: true,
      },
    });

    console.log("✅ Created subscription:", subscription.id, "Status:", status);

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("❌ Error creating subscription:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}