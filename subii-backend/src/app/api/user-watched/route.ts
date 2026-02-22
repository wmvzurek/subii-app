import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";
import axios from "axios";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Pobierz wszystkie tytuły użytkownika (obejrzane LUB ulubione)
  const userTitles = await prisma.userTitle.findMany({
    where: {
      userId,
      OR: [{ watched: true }, { favorite: true }],
    },
    include: {
      title: true,
    },
  });

  // Pobierz wszystkie obejrzane odcinki użytkownika
  const userEpisodes = await prisma.userEpisode.findMany({
    where: { userId },
    select: { tmdbSeriesId: true, seasonNumber: true, episodeNumber: true },
  });

  // Grupuj odcinki po serialu
  const episodesBySeriesId: Record<number, { season: number; episode: number }[]> = {};
  for (const ep of userEpisodes) {
    if (!episodesBySeriesId[ep.tmdbSeriesId]) {
      episodesBySeriesId[ep.tmdbSeriesId] = [];
    }
    episodesBySeriesId[ep.tmdbSeriesId].push({
      season: ep.seasonNumber,
      episode: ep.episodeNumber,
    });
  }

  const movies: {
    tmdbId: number;
    titlePL: string;
    posterUrl: string | null;
    year: number | null;
    favorite: boolean;
    watched: boolean;
    rating: number | null;
  }[] = [];

  const series: {
    tmdbId: number;
    titlePL: string;
    posterUrl: string | null;
    year: number | null;
    favorite: boolean;
    status: "completed" | "in_progress" | "favorite_only";
    watchedEpisodes: number;
    totalEpisodes: number;
    rating: number | null;
  }[] = [];

  for (const ut of userTitles) {
    const t = ut.title;
    const isTV = !t.runtime && episodesBySeriesId[t.tmdbId] !== undefined
      || userEpisodes.some(e => e.tmdbSeriesId === t.tmdbId);

    // Sprawdź czy to serial przez TMDB jeśli nie wiemy
    let isTVTitle = isTV;
    if (!isTVTitle && !ut.title.runtime) {
      // brak runtime = prawdopodobnie serial, sprawdzimy po tmdbId
      isTVTitle = userEpisodes.some(e => e.tmdbSeriesId === t.tmdbId);
    }

    if (isTVTitle || episodesBySeriesId[t.tmdbId]) {
      // Serial
      const watched = episodesBySeriesId[t.tmdbId] || [];
      const watchedCount = watched.length;

      // Pobierz łączną liczbę odcinków z TMDB
      let totalEpisodes = 0;
      try {
        const tvRes = await axios.get(`https://api.themoviedb.org/3/tv/${t.tmdbId}`, {
          params: { api_key: process.env.TMDB_API_KEY, language: "pl-PL" },
        });
        totalEpisodes = tvRes.data.number_of_episodes || 0;
      } catch {
        totalEpisodes = 0;
      }

      let status: "completed" | "in_progress" | "favorite_only" = "favorite_only";
      if (watchedCount > 0 && totalEpisodes > 0 && watchedCount >= totalEpisodes) {
        status = "completed";
      } else if (watchedCount > 0) {
        status = "in_progress";
      }

      series.push({
        tmdbId: t.tmdbId,
        titlePL: t.titlePL,
        posterUrl: t.posterUrl,
        year: t.year,
        favorite: ut.favorite,
        status,
        watchedEpisodes: watchedCount,
        totalEpisodes,
        rating: ut.rating,
      });
    } else {
      // Film
      movies.push({
        tmdbId: t.tmdbId,
        titlePL: t.titlePL,
        posterUrl: t.posterUrl,
        year: t.year,
        favorite: ut.favorite,
        watched: ut.watched,
        rating: ut.rating,
      });
    }
  }

  return NextResponse.json({ movies, series });
}