import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { generateAndSaveReport } from "./report";
import { sendReportEmail } from "./email";

const prisma = new PrismaClient();

export function startCronJobs() {
  // Odpala się codziennie o 00:00
  cron.schedule("0 0 * * *", async () => {
    console.log("⏰ [CRON] Start — sprawdzam użytkowników do rozliczenia...");

    const today = new Date();
    const todayDay = today.getDate();

    try {
      const users = await prisma.user.findMany({
        where: {
          billingDay: todayDay,
          emailVerified: true,
        },
      });

      console.log(`[CRON] Znaleziono ${users.length} userów (dzień rozliczeniowy: ${todayDay})`);

      for (const user of users) {
        try {
          console.log(`[CRON] Generuję raport dla userId=${user.id} (${user.email})`);

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
            console.log(`✅ [CRON] Raport wysłany do ${user.email}`);
          } else {
            console.log(`❌ [CRON] Błąd wysyłki do ${user.email}`);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Nieznany błąd";
          console.error(`❌ [CRON] Błąd dla userId=${user.id}:`, message);
        }
      }

      console.log("✅ [CRON] Zakończono przetwarzanie");
    } catch (err) {
      console.error("❌ [CRON] Błąd główny:", err);
    }
  });

  console.log("✅ [CRON] Zaplanowane zadania uruchomione");
}