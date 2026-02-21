import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// Mapowanie providerów na TMDB watch provider ID (Polska)
const PROVIDER_TMDB_IDS: Record<string, number> = {
  netflix: 8,
  disney_plus: 337,
  prime_video: 119,
  hbo_max: 1899,
  apple_tv: 350,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providerCode = searchParams.get("provider");

  if (!providerCode || !PROVIDER_TMDB_IDS[providerCode]) {
    return NextResponse.json({ titles: [] }, { status: 400 });
  }

  const providerId = PROVIDER_TMDB_IDS[providerCode];

  try {
    const res = await axios.get("https://api.themoviedb.org/3/discover/movie", {
      params: {
        api_key: process.env.TMDB_API_KEY,
        with_watch_providers: providerId,
        watch_region: "PL",
        language: "pl-PL",
        sort_by: "popularity.desc",
        page: 1,
      },
    });

    interface TMDBMovie {
      id: number;
      title?: string;
      name?: string;
      poster_path?: string;
      release_date?: string;
      vote_average?: number;
    }

    const titles = (res.data.results || []).slice(0, 10).map((item: TMDBMovie) => ({
      id: item.id,
      title: item.title || item.name,
      posterUrl: item.poster_path
        ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
        : null,
      year: item.release_date ? new Date(item.release_date).getFullYear() : null,
      rating: item.vote_average ? item.vote_average.toFixed(1) : null,
    }));

    return NextResponse.json({ titles });
  } catch (error) {
    console.error("[/api/provider-titles] error:", error);
    return NextResponse.json({ titles: [] }, { status: 500 });
  }
}