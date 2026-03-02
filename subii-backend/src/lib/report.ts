import puppeteer from "puppeteer";
import { prisma } from "@/lib/prisma";

export type ReportPeriod = {
  periodFrom: Date;
  periodTo: Date;
  period: string;
};

export function getReportPeriod(
  billingDay: number,
  referenceDate: Date = new Date()
): ReportPeriod {
  const now = new Date(referenceDate);

  const periodFrom = new Date(now.getFullYear(), now.getMonth() - 1, billingDay);
  const periodTo = new Date(now.getFullYear(), now.getMonth(), billingDay - 1);

  periodTo.setHours(23, 59, 59, 999);

  const period = `${periodFrom.getFullYear()}-${String(periodFrom.getMonth() + 1).padStart(2, "0")}`;

  return { periodFrom, periodTo, period };
}

type BillingItemRaw = {
  providerCode: string;
  planName: string;
  pricePLN: number;
};

type FallbackSubscription = {
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

async function getReportData(
  userId: number,
  periodFrom: Date,
  periodTo: Date,
  mode: "manual" | "automatic"
) {
  const effectiveTo = mode === "manual" ? new Date() : periodTo;

  const billingItems = await prisma.billingCycleItem.findMany({
    where: {
      billingCycle: {
        userId,
        billingDate: {
          gte: periodFrom,
          lte: new Date(effectiveTo.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    },
    include: {
      billingCycle: true,
    },
  });

  let fallbackSubscriptions: FallbackSubscription[] = [];

  if (billingItems.length === 0) {
    const activeSubs = await prisma.subscription.findMany({
      where: {
        userId,
        status: { in: ["active", "pending_change", "pending_cancellation"] },
        createdAt: { lte: effectiveTo },
      },
      include: {
        plan: true,
        provider: true,
      },
    });

    fallbackSubscriptions = activeSubs.map((sub) => ({
      providerCode: sub.provider?.name || sub.providerCode,
      planName: sub.plan?.planName || "—",
      pricePLN: sub.priceOverridePLN ?? sub.plan?.pricePLN ?? 0,
    }));
  }

  const watchedMovies = await prisma.userTitle.findMany({
    where: {
      userId,
      watched: true,
      updatedAt: {
        gte: periodFrom,
        lte: effectiveTo,
      },
    },
    include: {
      title: true,
    },
  });

  const watchedEpisodes = await prisma.userEpisode.findMany({
    where: {
      userId,
      watchedAt: {
        gte: periodFrom,
        lte: effectiveTo,
      },
    },
  });

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
    fallbackSubscriptions,
    watchedMovies,
    watchedSeries: Array.from(seriesMap.values()),
  };
}

function generateReportHTML(params: {
  firstName: string;
  period: string;
  periodFrom: Date;
  periodTo: Date;
  billingItems: BillingItemRaw[];
  fallbackSubscriptions: FallbackSubscription[];
  watchedMovies: WatchedMovieRaw[];
  watchedSeries: { title: string; episodeCount: number }[];
  mode: "manual" | "automatic";
}): string {
  const {
    firstName,
    periodFrom,
    periodTo,
    billingItems,
    fallbackSubscriptions,
    watchedMovies,
    watchedSeries,
    mode,
  } = params;

  const formatDate = (d: Date) =>
    d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

  const displayTo = mode === "manual" ? new Date() : periodTo;

  const hasBillingItems = billingItems.length > 0;
  const paymentRows = hasBillingItems ? billingItems : fallbackSubscriptions;

  const totalCost = paymentRows.reduce((sum, item) => sum + item.pricePLN, 0);

  const toTitleCase = (s: string) =>
    s
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const subscriptionsHTML =
    paymentRows.length > 0
      ? paymentRows
          .map(
            (item) => `
        <tr>
          <td class="td provider">${toTitleCase(item.providerCode)}</td>
          <td class="td plan">${item.planName}</td>
          <td class="td amount">${item.pricePLN.toFixed(2)} zł</td>
        </tr>`
          )
          .join("")
      : `
        <tr>
          <td class="td muted" colspan="3">Brak subskrypcji w tym okresie</td>
        </tr>`;

  const moviesHTML =
    watchedMovies.length > 0
      ? watchedMovies
          .map((ut) => {
            const year = ut.title.year ? ` <span class="muted">(${ut.title.year})</span>` : "";
            return `<li class="li">${ut.title.titlePL}${year}</li>`;
          })
          .join("")
      : `<li class="li muted">Brak obejrzanych filmów w tym okresie</li>`;

  const seriesHTML =
    watchedSeries.length > 0
      ? watchedSeries
          .map((s) => {
            const label =
              s.episodeCount === 1 ? "odcinek" : s.episodeCount < 5 ? "odcinki" : "odcinków";
            return `<li class="li">${s.title} <span class="muted">— ${s.episodeCount} ${label}</span></li>`;
          })
          .join("")
      : `<li class="li muted">Brak obejrzanych seriali w tym okresie</li>`;

  const generatedAt = new Date().toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const reportLabel =
    mode === "manual"
      ? `Raport bieżący (dane na dzień ${generatedAt})`
      : "Raport miesięczny (okres zamknięty)";

  return `
    <!DOCTYPE html>
    <html lang="pl">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Subii · Raport miesięczny</title>
        <style>
          :root {
            --bg: #f6f7fb;
            --card: #ffffff;
            --text: #111827;
            --muted: #6b7280;
            --border: #e5e7eb;
            --line: #eef2f7;
          }

          * { box-sizing: border-box; }
          html, body { height: 100%; }
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
          }

          .page {
            padding: 28px;
          }

          .card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 18px;
            box-shadow: 0 8px 24px rgba(17, 24, 39, 0.08);
            overflow: hidden;
          }

          .topbar {
            padding: 18px 22px;
            border-bottom: 1px solid var(--border);
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.2px;
          }

          .header {
            padding: 22px;
            border-bottom: 1px solid var(--border);
          }

          .title {
            margin: 0 0 8px 0;
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.2px;
          }

          .subtitle {
            margin: 0;
            font-size: 14px;
            line-height: 1.7;
            color: var(--muted);
          }

          .meta {
            margin-top: 12px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            font-size: 12px;
            color: var(--muted);
          }

          .chip {
            display: inline-block;
            padding: 6px 10px;
            border: 1px solid var(--border);
            border-radius: 999px;
            background: #fafafa;
          }

          .content {
            padding: 22px;
          }

          .section {
            margin-bottom: 18px;
          }

          .section:last-child {
            margin-bottom: 0;
          }

          .section-title {
            margin: 0 0 10px 0;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: var(--muted);
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          thead th {
            text-align: left;
            font-size: 12px;
            font-weight: 700;
            color: var(--muted);
            padding: 10px 0;
            border-bottom: 1px solid var(--line);
          }

          .td {
            padding: 12px 0;
            border-bottom: 1px solid var(--line);
            font-size: 14px;
            vertical-align: top;
          }

          .td.amount {
            text-align: right;
            font-weight: 700;
            white-space: nowrap;
          }

          .td.muted {
            text-align: center;
            color: var(--muted);
          }

          .total-row td {
            border-bottom: none;
            padding-top: 14px;
          }

          .total-row .label {
            font-weight: 700;
            color: var(--text);
          }

          .total-row .sum {
            text-align: right;
            font-weight: 800;
            font-size: 16px;
          }

          ul {
            list-style: none;
            margin: 0;
            padding: 0;
            border: 1px solid var(--border);
            border-radius: 14px;
            overflow: hidden;
            background: #fff;
          }

          .li {
            padding: 12px 14px;
            border-bottom: 1px solid var(--line);
            font-size: 14px;
          }

          .li:last-child {
            border-bottom: none;
          }

          .muted {
            color: var(--muted);
          }

          .footer {
            padding: 14px 22px;
            border-top: 1px solid var(--border);
            font-size: 12px;
            color: var(--muted);
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="card">
            <div class="topbar">Subii</div>

            <div class="header">
              <h1 class="title">Raport miesięczny</h1>
              <p class="subtitle">Cześć ${firstName}! Poniżej znajdziesz podsumowanie okresu.</p>
              <div class="meta">
                <span class="chip">Okres: <strong>${formatDate(periodFrom)} – ${formatDate(displayTo)}</strong></span>
                <span class="chip">${reportLabel}</span>
              </div>
            </div>

            <div class="content">
              <div class="section">
                <div class="section-title">
                  ${hasBillingItems ? "Płatności w tym okresie" : "Aktywne subskrypcje w tym okresie"}
                </div>

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
                      <td class="td label" colspan="2">Razem</td>
                      <td class="td sum">${totalCost.toFixed(2)} zł</td>
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
            </div>

            <div class="footer">
              Raport wygenerowany: ${new Date().toLocaleDateString("pl-PL")}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function generateAndSaveReport(
  userId: number,
  mode: "manual" | "automatic" = "manual"
): Promise<{
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

  const { billingItems, fallbackSubscriptions, watchedMovies, watchedSeries } =
    await getReportData(userId, periodFrom, periodTo, mode);

  const html = generateReportHTML({
    firstName: user.firstName,
    period,
    periodFrom,
    periodTo,
    billingItems,
    fallbackSubscriptions,
    watchedMovies,
    watchedSeries,
    mode,
  });

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

  const report = await prisma.paymentReport.upsert({
    where: { userId_period: { userId, period } },
    update: { pdfBase64, periodFrom, periodTo },
    create: { userId, period, periodFrom, periodTo, pdfBase64 },
  });

  return { pdfBase64, period, periodFrom, periodTo, reportId: report.id };
}