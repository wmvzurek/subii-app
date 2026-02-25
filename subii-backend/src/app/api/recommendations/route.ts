import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import axios from "axios";

import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ratedTitles = await prisma.userTitle.findMany({
    where: { userId, rating: { gte: 3 } },
    include: { title: true },
    orderBy: { rating: "desc" },
    take: 5,
  });

  const seenTitles = await prisma.userTitle.findMany({
    where: { userId },
    select: { title: { select: { tmdbId: true } } },
  });
  const seenIds = new Set(seenTitles.map(ut => ut.title.tmdbId));

  const recommendedIds = new Set<number>();
  const recommended: {
    id: number;
    title: string;
    posterUrl: string | null;
    year: string | null;
    mediaType: string;
    rating: number;
  }[] = [];

  if (ratedTitles.length > 0) {
    // TRYB 1 — rekomendacje na podstawie ocen użytkownika
    for (const ut of ratedTitles) {
      if (recommended.length >= 10) break;
      const tmdbId = ut.title.tmdbId;
      const mediaType = ut.title.runtime ? "movie" : "tv";

      try {
        const res = await axios.get(
          `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/recommendations`,
          { params: { api_key: process.env.TMDB_API_KEY, language: "pl-PL", page: 1 } }
        );

        for (const item of res.data.results || []) {
          if (recommended.length >= 10) break;
          if (recommendedIds.has(item.id)) continue;
          if (seenIds.has(item.id)) continue;
          if (!item.poster_path) continue;

          recommendedIds.add(item.id);
          recommended.push({
            id: item.id,
            title: item.title || item.name,
            posterUrl: `https://image.tmdb.org/t/p/w342${item.poster_path}`,
            year: item.release_date?.slice(0, 4) || item.first_air_date?.slice(0, 4) || null,
            mediaType: item.title ? "movie" : "tv",
            rating: item.vote_average,
          });
        }
      } catch (e) {
        console.error("[recommendations] błąd TRYB 1 dla tmdbId:", tmdbId, e);
      }
    }
  }

  // Jeśli TRYB 1 nie dał wyników (lub brak ocen) — pokaż popularne
  if (recommended.length === 0) {
    try {
      const [moviesRes, tvRes] = await Promise.all([
        axios.get("https://api.themoviedb.org/3/movie/popular", {
          params: { api_key: process.env.TMDB_API_KEY, language: "pl-PL", page: 1 },
        }),
        axios.get("https://api.themoviedb.org/3/tv/popular", {
          params: { api_key: process.env.TMDB_API_KEY, language: "pl-PL", page: 1 },
        }),
      ]);

      const allPopular = [
        ...(moviesRes.data.results || []).map((m: {
          id: number; title: string; poster_path: string;
          release_date: string; vote_average: number;
        }) => ({ ...m, mediaType: "movie" })),
        ...(tvRes.data.results || []).map((t: {
          id: number; name: string; poster_path: string;
          first_air_date: string; vote_average: number;
        }) => ({ ...t, title: t.name, mediaType: "tv" })),
      ]
        .filter(item => item.poster_path && !seenIds.has(item.id))
        .sort((a, b) => b.vote_average - a.vote_average);

      for (const item of allPopular) {
        if (recommended.length >= 10) break;
        if (recommendedIds.has(item.id)) continue;

        recommendedIds.add(item.id);
        recommended.push({
          id: item.id,
          title: item.title,
          posterUrl: `https://image.tmdb.org/t/p/w342${item.poster_path}`,
          year: item.release_date?.slice(0, 4) || item.first_air_date?.slice(0, 4) || null,
          mediaType: item.mediaType,
          rating: item.vote_average,
        });
      }
    } catch (e) {
      console.error("[recommendations] błąd popularnych:", e);
    }
  }

  return NextResponse.json({ recommended });
}