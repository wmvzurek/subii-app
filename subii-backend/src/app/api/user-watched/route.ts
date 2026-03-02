import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import axios from "axios";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 30;
  const skip = (page - 1) * limit;

  const [userTitles, totalCount] = await Promise.all([
    prisma.userTitle.findMany({
      where: {
        userId,
        OR: [{ watched: true }, { favorite: true }],
      },
      include: { title: true },
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.userTitle.count({
      where: {
        userId,
        OR: [{ watched: true }, { favorite: true }],
      },
    }),
  ]);

  const userEpisodes = await prisma.userEpisode.findMany({
    where: { userId },
    select: {
      tmdbSeriesId: true,
      seasonNumber: true,
      episodeNumber: true,
      seriesTitle: true,
      durationMinutes: true,
    },
  });

  const seriesIdsFromEpisodes = [
    ...new Set(userEpisodes.map((e) => e.tmdbSeriesId)),
  ];

  const existingTitleIds = new Set(userTitles.map((ut) => ut.title.tmdbId));
  const missingSeriesIds = seriesIdsFromEpisodes.filter(
    (id) => !existingTitleIds.has(id)
  );

  const missingTitles =
    missingSeriesIds.length > 0
      ? await prisma.title.findMany({
          where: { tmdbId: { in: missingSeriesIds } },
        })
      : [];

  const episodesBySeriesId: Record<
    number,
    { season: number; episode: number }[]
  > = {};

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

    const isTVTitle =
      t.mediaType === "tv" ||
      episodesBySeriesId[t.tmdbId] !== undefined ||
      userEpisodes.some((e) => e.tmdbSeriesId === t.tmdbId);

    if (isTVTitle || episodesBySeriesId[t.tmdbId]) {
      const watched = episodesBySeriesId[t.tmdbId] || [];
      const watchedCount = watched.length;

      let totalEpisodes = 0;
      try {
        const tvRes = await axios.get(
          `https://api.themoviedb.org/3/tv/${t.tmdbId}`,
          {
            params: {
              api_key: process.env.TMDB_API_KEY,
              language: "pl-PL",
            },
          }
        );
        totalEpisodes = tvRes.data.number_of_episodes || 0;
      } catch {
        totalEpisodes = 0;
      }

      let status: "completed" | "in_progress" | "favorite_only" =
        "favorite_only";

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

  for (const t of missingTitles) {
    const watched = episodesBySeriesId[t.tmdbId] || [];
    const watchedCount = watched.length;

    let totalEpisodes = 0;
    try {
      const tvRes = await axios.get(
        `https://api.themoviedb.org/3/tv/${t.tmdbId}`,
        {
          params: {
            api_key: process.env.TMDB_API_KEY,
            language: "pl-PL",
          },
        }
      );
      totalEpisodes = tvRes.data.number_of_episodes || 0;
    } catch {
      totalEpisodes = 0;
    }

    let status: "completed" | "in_progress" | "favorite_only" = "in_progress";

    if (watchedCount > 0 && totalEpisodes > 0 && watchedCount >= totalEpisodes) {
      status = "completed";
    }

    series.push({
      tmdbId: t.tmdbId,
      titlePL: t.titlePL,
      posterUrl: t.posterUrl,
      year: t.year,
      favorite: false,
      status,
      watchedEpisodes: watchedCount,
      totalEpisodes,
      rating: null,
    });
  }

  return NextResponse.json({
    movies,
    series,
    pagination: {
      page,
      limit,
      total: totalCount,
      hasMore: skip + limit < totalCount,
    },
  });
}