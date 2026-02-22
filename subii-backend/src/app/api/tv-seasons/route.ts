import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

// GET /api/tv-seasons?tmdbId=123
// Zwraca sezony z odcinkami dla danego serialu
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tmdbId = searchParams.get("tmdbId");

  if (!tmdbId) return NextResponse.json({ error: "tmdbId required" }, { status: 400 });

  try {
    // Pobierz listę sezonów
    const tvRes = await axios.get(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
      params: { api_key: process.env.TMDB_API_KEY, language: "pl-PL" },
    });

    const seasons = (tvRes.data.seasons as { season_number: number; name: string; episode_count: number }[])?.filter((s) => s.season_number > 0) || [];

    // Dla każdego sezonu pobierz odcinki
    const seasonsWithEpisodes = await Promise.all(
      seasons.map(async (season) => {
        try {
          const seasonRes = await axios.get(
            `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season.season_number}`,
            { params: { api_key: process.env.TMDB_API_KEY, language: "pl-PL" } }
          );
          return {
            seasonNumber: season.season_number,
            name: season.name,
            episodeCount: season.episode_count,
            episodes: (seasonRes.data.episodes as { episode_number: number; name: string; air_date: string; runtime: number | null; overview: string }[] || []).map((ep) => ({
              episodeNumber: ep.episode_number,
              name: ep.name,
              airDate: ep.air_date,
              runtime: ep.runtime || null,
              overview: ep.overview || "",
            })),
          };
        } catch {
          return {
            seasonNumber: season.season_number,
            name: season.name,
            episodeCount: season.episode_count,
            episodes: [],
          };
        }
      })
    );

    return NextResponse.json({ seasons: seasonsWithEpisodes });
  } catch {
    return NextResponse.json({ error: "Nie udało się pobrać sezonów" }, { status: 500 });
  }
}