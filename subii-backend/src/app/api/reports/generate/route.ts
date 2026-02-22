import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";
import { generateAndSaveReport } from "@/lib/report";
import { sendReportEmail } from "@/lib/email";

const prisma = new PrismaClient();

// POST /api/reports/generate
// Body: { sendEmail?: boolean }
export async function POST(req: Request) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sendEmail = body.sendEmail === true;

  try {
    const { pdfBase64, period, periodFrom, periodTo, reportId } =
      await generateAndSaveReport(userId);

    if (sendEmail) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      if (!user.emailVerified) {
        return NextResponse.json(
          { error: "Email nie został zweryfikowany" },
          { status: 400 }
        );
      }

      const sent = await sendReportEmail(
        user.email,
        user.firstName,
        period,
        periodFrom,
        periodTo,
        pdfBase64
      );

      if (sent) {
        await prisma.paymentReport.update({
          where: { id: reportId },
          data: { sentAt: new Date() },
        });
      }

      return NextResponse.json({
        message: sent ? "Raport wygenerowany i wysłany na email" : "Raport wygenerowany, błąd wysyłki maila",
        reportId,
        period,
        emailSent: sent,
      });
    }

    return NextResponse.json({
      message: "Raport wygenerowany",
      reportId,
      period,
      emailSent: false,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Błąd generowania raportu";
    console.error("[POST /api/reports/generate] error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}