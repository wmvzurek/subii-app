import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const reports = await prisma.paymentReport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        period: true,
        periodFrom: true,
        periodTo: true,
        sentAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[GET /api/reports] error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}