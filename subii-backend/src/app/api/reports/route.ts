import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

// GET /api/reports
// Zwraca listę raportów użytkownika (bez pdfBase64 — tylko metadane)
export async function GET(req: Request) {
  const userId = getUserFromRequest(req);
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