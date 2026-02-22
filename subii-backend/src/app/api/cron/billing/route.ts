import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { generateAndSaveReport } from "@/lib/report";
import { sendReportEmail } from "@/lib/email";

const prisma = new PrismaClient();

// POST /api/cron/billing
// Wywoływany codziennie o 00:00 przez cron serwera
// Wymaga headera Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const todayDay = today.getDate();

  try {
    // Znajdź wszystkich userów których billingDay = dzisiaj i mają zweryfikowany email
    const users = await prisma.user.findMany({
      where: {
        billingDay: todayDay,
        emailVerified: true,
      },
    });

    console.log(`[CRON] Znaleziono ${users.length} userów do rozliczenia (dzień ${todayDay})`);

    const results = [];

    for (const user of users) {
      try {
        const { pdfBase64, period, periodFrom, periodTo, reportId } =
          await generateAndSaveReport(user.id);

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

        results.push({ userId: user.id, period, emailSent: sent, success: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Nieznany błąd";
        console.error(`[CRON] Błąd dla userId=${user.id}:`, message);
        results.push({ userId: user.id, success: false, error: message });
      }
    }

    return NextResponse.json({ processed: users.length, results });
  } catch (error) {
    console.error("[CRON] Błąd główny:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}