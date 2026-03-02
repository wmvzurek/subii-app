import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAndSaveReport } from "@/lib/report";
import { sendReportEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.getDate();

  const users = await prisma.user.findMany({
    where: {
      billingDay: tomorrowDay,
      emailVerified: true,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      billingDay: true,
    },
  });

  const results: { userId: number; status: string; error?: string }[] = [];

  for (const user of users) {
    try {
      const { pdfBase64, period, periodFrom, periodTo, reportId } =
        await generateAndSaveReport(user.id, "automatic");

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

      results.push({
        userId: user.id,
        status: sent ? "generated_and_sent" : "generated_not_sent",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nieznany błąd";
      console.error(`[cron/generate-report] Błąd dla userId=${user.id}:`, message);
      results.push({
        userId: user.id,
        status: "error",
        error: message,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: users.length,
    results,
  });
}