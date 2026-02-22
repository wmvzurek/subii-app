import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Centralny słownik nazw platform (taki sam jak w mobile)
const PROVIDER_CODE_MAP: Record<string, string> = {
  // Netflix
  "netflix": "netflix",

  // HBO Max
  "hbo max": "hbo_max",
  "hbo go": "hbo_max",
  "max": "hbo_max",

  // Disney+
  "disney plus": "disney_plus",
  "disney+": "disney_plus",
  "disney+ standard with ads": "disney_plus",

  // Canal+
  "canal+": "canal_plus",
  "canal plus": "canal_plus",
  "canal+ online": "canal_plus",
  "canal+ seriale i filmy": "canal_plus",
  "canal+ super sport": "canal_plus",

  // Amazon Prime Video
  "prime video": "prime_video",
  "amazon prime video": "prime_video",
  "amazon video": "prime_video",
  "amazon prime": "prime_video",

  // Apple TV+
  "apple tv+": "apple_tv",
  "apple tv": "apple_tv",
  "apple tv plus": "apple_tv",

  // SkyShowtime
  "skyshowtime": "skyshowtime",
  "sky showtime": "skyshowtime",

  // Polsat Box Go
  "polsat box go": "polsat_box_go",
  "polsat box go premium": "polsat_box_go",
  "polsat box go sport": "polsat_box_go",
  "ipla": "polsat_box_go",

  // Player
  "player": "player",
  "player.pl": "player",
  "tvn player": "player",
};

// Tylko te platformy obsługuje Subii
const SUPPORTED_PROVIDER_CODES = new Set([
  "netflix",
  "hbo_max",
  "disney_plus",
  "canal_plus",
  "prime_video",
  "apple_tv",
  "skyshowtime",
  "polsat_box_go",
  "player",
]);

interface TMDBProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

interface TMDBWatchProviders {
  flatrate?: TMDBProvider[];
  rent?: TMDBProvider[];
  buy?: TMDBProvider[];
  free?: TMDBProvider[];
}

interface AvailabilitySource {
  name: string;
  providerCode: string;
  type: string;
  logo_url: string | null;
  web_url?: string;
  price?: string | null;
  cheapestPlan?: {
    planName: string;
    pricePLN: number;
    cycle: string;
  } | null;
}

// Pobiera najtańszy miesięczny plan danego providera
async function getCheapestPlan(providerCode: string) {
  try {
    const plans = await prisma.plan.findMany({
      where: { providerCode, cycle: "monthly" },
      orderBy: { pricePLN: "asc" },
      take: 1,
    });
    if (plans.length === 0) return null;
    return {
      planName: plans[0].planName,
      pricePLN: plans[0].pricePLN,
      cycle: plans[0].cycle,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tmdbId = searchParams.get("tmdbId") || "";
  const title = searchParams.get("title");

  if (!tmdbId && !title) return NextResponse.json({ sources: [] });

  try {
    const sources: AvailabilitySource[] = [];

    if (tmdbId) {
      let providersData: TMDBWatchProviders | null = null;

      // Sprawdź movie
      try {
        const res = await axios.get(
          `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers`,
          { params: { api_key: process.env.TMDB_API_KEY } }
        );
        providersData = res.data.results?.PL || null;
      } catch {
        // ignoruj
      }

      // Fallback na tv jeśli movie nie miało danych PL
      if (!providersData) {
        try {
          const res = await axios.get(
            `https://api.themoviedb.org/3/tv/${tmdbId}/watch/providers`,
            { params: { api_key: process.env.TMDB_API_KEY } }
          );
          providersData = res.data.results?.PL || null;
        } catch {
          // ignoruj
        }
      }

      if (providersData) {
        const typeLabels: Record<string, string> = {
          flatrate: "subscription",
          rent:     "rent",
          buy:      "buy",
          free:     "free",
        };

        for (const [type, providers] of Object.entries(providersData)) {
          if (!Array.isArray(providers)) continue;

          for (const p of providers as TMDBProvider[]) {
            const normalized = p.provider_name.toLowerCase().trim();
            const providerCode = PROVIDER_CODE_MAP[normalized];

            // Pomiń platformy nieobsługiwane przez Subii
            if (!providerCode || !SUPPORTED_PROVIDER_CODES.has(providerCode)) {
              continue;
            }

            // Nie duplikuj tej samej platformy
            const exists = sources.find((s) => s.providerCode === providerCode);
            if (exists) {
              // Jeśli ten sam provider pojawia się w lepszym typie — zaktualizuj typ
              const order = ["subscription", "rent", "buy", "free"];
              const existingIdx = order.indexOf(exists.type);
              const newIdx = order.indexOf(typeLabels[type] || type);
              if (newIdx < existingIdx) {
                exists.type = typeLabels[type] || type;
              }
              continue;
            }

            // Pobierz najtańszy plan
            const cheapestPlan = await getCheapestPlan(providerCode);

            sources.push({
              name: p.provider_name,
              providerCode,
              type: typeLabels[type] || type,
              logo_url: p.logo_path
                ? `https://image.tmdb.org/t/p/w92${p.logo_path}`
                : null,
              web_url: `https://www.justwatch.com/pl/szukaj?q=${encodeURIComponent(title || "")}`,
              cheapestPlan,
            });
          }
        }
      }
    }

    // Sortuj: subscription → rent → buy → free
    const order = ["subscription", "rent", "buy", "free"];
    sources.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

    return NextResponse.json({ sources });

  } catch (error) {
    console.error("[/api/availability] error:", error);
    return NextResponse.json({ sources: [] }, { status: 500 });
  }
}