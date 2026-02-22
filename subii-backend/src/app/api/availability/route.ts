import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

interface TMDBProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

interface TMDBWatchProviders {
  flatrate?: TMDBProvider[];
  rent?: TMDBProvider[];
  buy?: TMDBProvider[];
  free?: TMDBProvider[];
}

interface AvailabilitySource {
  name: string;
  type: string;
  logo_url: string | null;
  web_url?: string;
  price?: string | null;
  format?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tmdbId = searchParams.get("tmdbId") || "";
  const title = searchParams.get("title");
  console.log("[availability] Received params - tmdbId:", tmdbId, "title:", title);

  if (!tmdbId && !title) return NextResponse.json({ sources: [] });

  try {
    let sources: AvailabilitySource[] = [];

    if (tmdbId) {
      let providersData: TMDBWatchProviders | null = null;

      // Sprawdź movie
      try {
        const res = await axios.get(
          `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers`,
          { params: { api_key: process.env.TMDB_API_KEY } }
        );
        providersData = res.data.results?.PL || null;
        console.log("[availability] TMDB movie providers PL:", providersData);
      } catch {
        // ignoruj
      }

      // Zawsze sprawdź też tv jeśli movie nie miało danych PL
      if (!providersData) {
        try {
          const res = await axios.get(
            `https://api.themoviedb.org/3/tv/${tmdbId}/watch/providers`,
            { params: { api_key: process.env.TMDB_API_KEY } }
          );
          providersData = res.data.results?.PL || null;
          console.log("[availability] TMDB tv providers PL:", providersData);
        } catch (e) {
          console.log("[availability] TMDB tv providers failed:", e);
        }
      }

      if (providersData) {
  const typeLabels: Record<string, string> = {
    flatrate: "subscription",
    rent: "rent",
    buy: "buy",
    free: "free",
  };

  // Pobierz prawdziwy tytuł z TMDB
  let realTitle = title || "";
try {
  const tvRes = await axios.get(
    `https://api.themoviedb.org/3/tv/${tmdbId}`,
    { params: { api_key: process.env.TMDB_API_KEY, language: "pl-PL" } }
  );
  if (tvRes.data.name) {
    realTitle = tvRes.data.name;
  } else {
    const movieRes = await axios.get(
      `https://api.themoviedb.org/3/movie/${tmdbId}`,
      { params: { api_key: process.env.TMDB_API_KEY, language: "pl-PL" } }
    );
    realTitle = movieRes.data.title || title || "";
  }
} catch {
  try {
    const movieRes = await axios.get(
      `https://api.themoviedb.org/3/movie/${tmdbId}`,
      { params: { api_key: process.env.TMDB_API_KEY, language: "pl-PL" } }
    );
    realTitle = movieRes.data.title || title || "";
  } catch {}
}
console.log("[availability] Real title for JustWatch:", realTitle);
  console.log("[availability] Real title for JustWatch:", realTitle);

  for (const [type, providers] of Object.entries(providersData)) {
    if (!Array.isArray(providers)) continue;
    for (const p of providers as TMDBProvider[]) {
      const exists = sources.find(
        (s) => s.name === p.provider_name && s.type === typeLabels[type]
      );
      if (exists) continue;

      sources.push({
        name: p.provider_name,
        type: typeLabels[type] || type,
        logo_url: p.logo_path
          ? `https://image.tmdb.org/t/p/w92${p.logo_path}`
          : null,
        web_url: `https://www.justwatch.com/pl/szukaj?q=${encodeURIComponent(realTitle)}`,
      });
    }
  }
}

      // Sortuj: najpierw subscription, potem rent, buy, free
      const order = ["subscription", "rent", "buy", "free"];
      sources.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
    }

    console.log("[availability] Final sources:", sources.length);
    return NextResponse.json({ sources });

  } catch (error) {
    console.error("[/api/availability] error:", error);
    return NextResponse.json({ sources: [] }, { status: 500 });
  }
}