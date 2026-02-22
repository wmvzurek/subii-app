import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

// GET /api/reports/:id
// Zwraca PDF jako base64
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const report = await prisma.paymentReport.findFirst({
      where: { id, userId },
    });

    if (!report) {
      return NextResponse.json({ error: "Raport nie znaleziony" }, { status: 404 });
    }

    return NextResponse.json({
      id: report.id,
      period: report.period,
      periodFrom: report.periodFrom,
      periodTo: report.periodTo,
      pdfBase64: report.pdfBase64,
      sentAt: report.sentAt,
      createdAt: report.createdAt,
    });
  } catch (error) {
    console.error("[GET /api/reports/:id] error:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}