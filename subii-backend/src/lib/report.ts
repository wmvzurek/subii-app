import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer";

const prisma = new PrismaClient();

export type ReportPeriod = {
  periodFrom: Date;
  periodTo: Date;
  period: string; // "2026-03"
};

/**
 * Oblicza okno okresu raportu na podstawie billingDay.
 * Np. billingDay=15, dziś=2026-03-15 → od 2026-02-15 do 2026-03-14
 */
export function getReportPeriod(billingDay: number, referenceDate: Date = new Date()): ReportPeriod {
  const now = new Date(referenceDate);
  const currentMonthBilling = new Date(now.getFullYear(), now.getMonth(), billingDay);

  let periodFrom: Date;
  let periodTo: Date;

  if (now >= currentMonthBilling) {
    // Jesteśmy po lub w dniu rozliczeniowym — raport za ostatni zakończony okres
    periodFrom = new Date(now.getFullYear(), now.getMonth() - 1, billingDay);
    periodTo = new Date(now.getFullYear(), now.getMonth(), billingDay - 1);
  } else {
    // Jesteśmy przed dniem rozliczeniowym — raport za poprzedni okres
    periodFrom = new Date(now.getFullYear(), now.getMonth() - 2, billingDay);
    periodTo = new Date(now.getFullYear(), now.getMonth() - 1, billingDay - 1);
  }

  periodTo.setHours(23, 59, 59, 999);

  // period string = miesiąc dnia rozliczeniowego (periodTo)
  const period = `${periodTo.getFullYear()}-${String(periodTo.getMonth() + 1).padStart(2, "0")}`;

  return { periodFrom, periodTo, period };
}

/**
 * Pobiera dane do raportu dla danego użytkownika i okresu.
 */
async function getReportData(userId: number, periodFrom: Date, periodTo: Date) {
  // 1. Subskrypcje aktywne w tym okresie (na podstawie BillingCycle items)
  const billingItems = await prisma.billingCycleItem.findMany({
    where: {
      billingCycle: {
        userId,
        billingDate: {
          gte: periodFrom,
          lte: new Date(periodTo.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    },
    include: {
      billingCycle: true,
    },
  });

  // 2. Obejrzane filmy w tym okresie (UserTitle.updatedAt w oknie, watched=true)
  const watchedMovies = await prisma.userTitle.findMany({
    where: {
      userId,
      watched: true,
      updatedAt: {
        gte: periodFrom,
        lte: periodTo,
      },
    },
    include: {
      title: true,
    },
  });

  // 3. Obejrzane odcinki seriali w tym okresie (UserEpisode.createdAt w oknie)
  const watchedEpisodes = await prisma.userEpisode.findMany({
    where: {
      userId,
      watchedAt: {
        gte: periodFrom,
        lte: periodTo,
      },
    },
  });

  // Grupuj odcinki po serialu
  const seriesMap = new Map<number, { title: string; episodeCount: number }>();
  for (const ep of watchedEpisodes) {
    if (!seriesMap.has(ep.tmdbSeriesId)) {
      seriesMap.set(ep.tmdbSeriesId, {
        title: ep.seriesTitle || `Serial #${ep.tmdbSeriesId}`,
        episodeCount: 0,
      });
    }
    seriesMap.get(ep.tmdbSeriesId)!.episodeCount++;
  }

  return {
    billingItems,
    watchedMovies,
    watchedSeries: Array.from(seriesMap.values()),
  };
}

/**
 * Generuje HTML raportu.
 */
type BillingItemRaw = {
  providerCode: string;
  planName: string;
  pricePLN: number;
};

type WatchedMovieRaw = {
  title: {
    titlePL: string;
    year: number | null;
  };
};

function generateReportHTML(params: {
  firstName: string;
  period: string;
  periodFrom: Date;
  periodTo: Date;
  billingItems: BillingItemRaw[];
  watchedMovies: WatchedMovieRaw[];
  watchedSeries: { title: string; episodeCount: number }[];
}): string {
  const { firstName, period, periodFrom, periodTo, billingItems, watchedMovies, watchedSeries } = params;

  const formatDate = (d: Date) =>
    d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

  const totalCost = billingItems.reduce((sum, item) => sum + item.pricePLN, 0);

  const subscriptionsHTML = billingItems.length > 0
    ? billingItems.map(item => `
        <tr>
          <td>${item.providerCode.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</td>
          <td>${item.planName}</td>
          <td style="text-align:right;font-weight:700;">${item.pricePLN.toFixed(2)} zł</td>
        </tr>
      `).join("")
    : `<tr><td colspan="3" style="color:#999;text-align:center;">Brak subskrypcji w tym okresie</td></tr>`;

  const moviesHTML = watchedMovies.length > 0
    ? watchedMovies.map(ut => `
        <li>${ut.title.titlePL}${ut.title.year ? ` <span style="color:#999">(${ut.title.year})</span>` : ""}</li>
      `).join("")
    : `<li style="color:#999;">Brak obejrzanych filmów w tym okresie</li>`;

  const seriesHTML = watchedSeries.length > 0
    ? watchedSeries.map(s => `
        <li>${s.title} <span style="color:#666;">— ${s.episodeCount} ${s.episodeCount === 1 ? "odcinek" : s.episodeCount < 5 ? "odcinki" : "odcinków"}</span></li>
      `).join("")
    : `<li style="color:#999;">Brak obejrzanych seriali w tym okresie</li>`;

  return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #111; background: #fff; padding: 40px; }
        .header { background: #000; color: #fff; padding: 32px 40px; border-radius: 12px; margin-bottom: 32px; }
        .header h1 { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
        .header p { font-size: 14px; color: rgba(255,255,255,0.7); margin-top: 6px; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 12px; color: #999; font-weight: 600; padding: 8px 0; border-bottom: 1px solid #eee; }
        td { padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
        .total-row td { font-size: 16px; font-weight: 800; border-bottom: none; padding-top: 16px; }
        ul { list-style: none; padding: 0; }
        ul li { font-size: 14px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        ul li:last-child { border-bottom: none; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
        .badge { display: inline-block; background: #f0f0f0; border-radius: 6px; padding: 4px 10px; font-size: 12px; font-weight: 600; color: #333; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Subii · Raport miesięczny</h1>
        <p>Cześć ${firstName}! Oto podsumowanie Twojego miesiąca.</p>
        <p style="margin-top:8px;">
          Okres: <strong>${formatDate(periodFrom)} – ${formatDate(periodTo)}</strong>
        </p>
      </div>

      <div class="section">
        <div class="section-title">Płatności w tym okresie</div>
        <table>
          <thead>
            <tr>
              <th>Platforma</th>
              <th>Plan</th>
              <th style="text-align:right;">Kwota</th>
            </tr>
          </thead>
          <tbody>
            ${subscriptionsHTML}
            <tr class="total-row">
              <td colspan="2">Razem</td>
              <td style="text-align:right;">${totalCost.toFixed(2)} zł</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Obejrzane filmy</div>
        <ul>${moviesHTML}</ul>
      </div>

      <div class="section">
        <div class="section-title">Obejrzane seriale</div>
        <ul>${seriesHTML}</ul>
      </div>

      <div class="footer">
        Raport wygenerowany automatycznie przez Subii · ${new Date().toLocaleDateString("pl-PL")}
      </div>
    </body>
    </html>
  `;
}

/**
 * Główna funkcja — generuje PDF i zapisuje do bazy.
 * Zwraca base64 PDF.
 */
export async function generateAndSaveReport(userId: number): Promise<{
  pdfBase64: string;
  period: string;
  periodFrom: Date;
  periodTo: Date;
  reportId: string;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (!user.billingDay) throw new Error("Brak ustawionego dnia rozliczeniowego");

  const { period, periodFrom, periodTo } = getReportPeriod(user.billingDay);

  const { billingItems, watchedMovies, watchedSeries } = await getReportData(userId, periodFrom, periodTo);

  const html = generateReportHTML({
    firstName: user.firstName,
    period,
    periodFrom,
    periodTo,
    billingItems,
    watchedMovies,
    watchedSeries,
  });

  // Generuj PDF przez Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
    printBackground: true,
  });
  await browser.close();

  const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

  // Zapisz do bazy (upsert — nadpisz jeśli już istnieje za ten okres)
  const report = await prisma.paymentReport.upsert({
    where: { userId_period: { userId, period } },
    update: { pdfBase64, periodFrom, periodTo },
    create: { userId, period, periodFrom, periodTo, pdfBase64 },
  });

  return { pdfBase64, period, periodFrom, periodTo, reportId: report.id };
}