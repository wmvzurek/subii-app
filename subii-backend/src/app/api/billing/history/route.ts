import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const history = await prisma.billingCycle.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: { billingDate: "desc" },
      take: 12,
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("[GET /api/billing/history] error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}