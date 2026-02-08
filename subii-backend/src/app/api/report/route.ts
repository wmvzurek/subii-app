// src/app/api/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const userId = getUserFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);

    // 1) Koszty - aktywne subskrypcje usera
    const subscriptions = await prisma.subscription.findMany({
      where: { userId, status: "active" },
      include: { plan: true, provider: true }
    });

    const costs = subscriptions.map(sub => ({
      providerCode: sub.providerCode,
      providerName: sub.provider.name,
      planName: sub.plan.planName,
      pricePLN: sub.priceOverridePLN || sub.plan.pricePLN,
    }));

    const totalCost = costs.reduce((sum, c) => sum + c.pricePLN, 0);

    // 2) Historia oglądania w danym okresie
    let watched = await prisma.watchEvent.findMany({
      where: { userId, period },
      orderBy: { watchedAt: "desc" },
      take: 20
    });

    // Jeśli brak danych - zasiej demo dane
    if (watched.length === 0) {
      await prisma.watchEvent.createMany({
        data: [
          { userId, title: "Incepcja", minutes: 148, period },
          { userId, title: "Duna", minutes: 155, period },
          { userId, title: "Na noże", minutes: 130, period },
        ],
      });
      watched = await prisma.watchEvent.findMany({
        where: { userId, period }
      });
    }

    // 3) Sugestie oszczędności
    const suggestions: string[] = [];
    
    if (watched.length < 3) {
      suggestions.push(
        "Mało oglądałaś w tym miesiącu — rozważ pauzę subskrypcji z najmniejszą liczbą seansów."
      );
    }

    // Sprawdź czy są niewykorzystane platformy
    const watchedProviders = new Set<string>();
    // TODO: w przyszłości możesz dodać pole providerCode do WatchEvent
    
    if (subscriptions.length > 3) {
      suggestions.push(
        "Masz wiele aktywnych subskrypcji. Sprawdź czy wszystkie są potrzebne."
      );
    }

    return NextResponse.json({
      period,
      totalCost,
      costs,
      watched,
      suggestions,
      summary: {
        activeSubscriptions: subscriptions.length,
        watchedTitles: watched.length,
        totalMinutes: watched.reduce((sum, w) => sum + w.minutes, 0)
      }
    });
  } catch (error) {
    console.error("[GET /api/report] error:", error);
    return NextResponse.json(
      { error: "Failed to build report" },
      { status: 500 }
    );
  }
}