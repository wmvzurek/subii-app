// src/app/api/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function cors() {
  return { "access-control-allow-origin": "*", "content-type": "application/json" };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7); // YYYY-MM

    // 1) Koszty = lista aktywnych planów w PL
    const plans = await prisma.plan.findMany({ where: { country: "PL" } });
    const costs = plans.map((p) => ({
      providerCode: p.providerCode,
      pricePLN: p.pricePLN,
    }));

    // 2) Oglądane (MVP – demo jeśli brak danych w danym okresie)
    let watched = await prisma.watchEvent.findMany({ where: { period }, take: 10 });

    if (watched.length === 0) {
      // Zasień demodane (UWAGA: usuwamy skipDuplicates, bo powodował błąd typów)
      await prisma.watchEvent.createMany({
        data: [
          { title: "Incepcja", minutes: 148, period },
          { title: "Duna", minutes: 155, period },
          { title: "Na noże", minutes: 130, period },
        ],
      });
      watched = await prisma.watchEvent.findMany({ where: { period } });
    }

    // 3) Proste sugestie oszczędności
    const suggestions: string[] = [];
    if (watched.length < 2) {
      suggestions.push(
        "Mało oglądałaś w tym miesiącu — rozważ pauzę subskrypcji z najmniejszą liczbą seansów."
      );
    }

    return NextResponse.json({ period, costs, watched, suggestions }, { headers: cors() });
  } catch (err) {
    console.error("[/api/report] error:", err);
    return NextResponse.json(
      { error: "Failed to build report" },
      { status: 500, headers: cors() }
    );
  }
}
