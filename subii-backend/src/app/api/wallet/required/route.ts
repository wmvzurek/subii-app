import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month"; // "month" lub "year"

  try {
    // 1) Pobierz wszystkie aktywne subskrypcje
    const subscriptions = await prisma.subscription.findMany({
      where: { 
        userId, 
        status: "active" 
      },
      include: { plan: true, provider: true }
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({
        totalRequired: 0,
        currentBalance: 0,
        missing: 0,
        subscriptions: []
      });
    }

    // 2) Oblicz całkowitą kwotę (według cyklu)
    let totalMonthly = 0;
    const details = subscriptions.map(sub => {
      const price = sub.priceOverridePLN || sub.plan.pricePLN;
      totalMonthly += price;
      
      return {
        provider: sub.provider.name,
        plan: sub.plan.planName,
        price,
        nextDueDate: sub.nextDueDate,
      };
    });

    const totalRequired = period === "year" ? totalMonthly * 12 : totalMonthly;

    // 3) Sprawdź saldo portfela
    let wallet = await prisma.wallet.findUnique({ where: { userId } });
    
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId, balance: 0 }
      });
    }

    const missing = Math.max(0, totalRequired - wallet.balance);

    return NextResponse.json({
      period,
      totalRequired, // Ile łącznie potrzeba na miesiąc/rok
      currentBalance: wallet.balance, // Ile masz teraz
      missing, // Ile brakuje
      subscriptions: details,
      breakdown: {
        count: subscriptions.length,
        monthlyTotal: totalMonthly,
        yearlyTotal: totalMonthly * 12,
      }
    });
  } catch (error) {
    console.error("[/api/wallet/required] error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}