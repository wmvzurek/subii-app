import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAndSaveReport } from "@/lib/report";
import { sendReportEmail } from "@/lib/email";

/**
 * GET /api/cron/generate-report
 * Wywołuj codziennie o 23:59 (Vercel Cron lub zewnętrzny scheduler).
 * Dla userów których billingDay wypada JUTRO (czyli dziś jest ostatni dzień ich okresu)
 * generuje zamknięty raport za miniony okres i wysyła go mailem.
 */
export async function GET(req: NextRequest) {
  // Zabezpieczenie — tylko wywołania z sekretnym kluczem
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Jutrzejsza data — szukamy userów których billingDay = jutro
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.getDate();

  // Pobierz wszystkich userów z billingDay równym jutrzejszemu dniu
  // i zweryfikowanym emailem
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
      // Generuj raport w trybie automatic (pełne zamknięte okno periodFrom → periodTo)
      const { pdfBase64, period, periodFrom, periodTo, reportId } =
        await generateAndSaveReport(user.id, "automatic");

      // Wyślij mailem
      const sent = await sendReportEmail(
        user.email,
        user.firstName,
        period,
        periodFrom,
        periodTo,
        pdfBase64
      );

      // Zaktualizuj sentAt jeśli wysłano
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