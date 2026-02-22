import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const history = await prisma.billingCycle.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: { billingDate: "desc" },
      take: 12, // ostatnie 12 miesięcy
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("[GET /api/billing/history] error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}