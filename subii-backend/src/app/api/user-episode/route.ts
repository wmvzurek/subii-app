import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    tmdbSeriesId,
    seasonNumber,
    episodeNumber,
    durationMinutes,
    watched,
    seriesTitle,
  } = body;

  if (
    !tmdbSeriesId ||
    seasonNumber === undefined ||
    episodeNumber === undefined
  ) {
    return NextResponse.json(
      { error: "Brakuje wymaganych pól" },
      { status: 400 }
    );
  }

  if (isNaN(Number(tmdbSeriesId)) || Number(tmdbSeriesId) <= 0) {
    return NextResponse.json(
      { error: "Nieprawidłowe tmdbSeriesId" },
      { status: 400 }
    );
  }

  if (isNaN(Number(seasonNumber)) || Number(seasonNumber) < 0) {
    return NextResponse.json(
      { error: "Nieprawidłowy numer sezonu" },
      { status: 400 }
    );
  }

  if (isNaN(Number(episodeNumber)) || Number(episodeNumber) < 1) {
    return NextResponse.json(
      { error: "Nieprawidłowy numer odcinka" },
      { status: 400 }
    );
  }

  if (durationMinutes !== undefined && durationMinutes !== null) {
    if (
      isNaN(Number(durationMinutes)) ||
      Number(durationMinutes) < 0 ||
      Number(durationMinutes) > 600
    ) {
      return NextResponse.json(
        { error: "Nieprawidłowy czas trwania odcinka (0-600 minut)" },
        { status: 400 }
      );
    }
  }

  if (watched) {
    await prisma.userEpisode.upsert({
      where: {
        userId_tmdbSeriesId_seasonNumber_episodeNumber: {
          userId,
          tmdbSeriesId,
          seasonNumber,
          episodeNumber,
        },
      },
      update: {
        durationMinutes: durationMinutes ?? null,
        watchedAt: new Date(),
      },
      create: {
        userId,
        tmdbSeriesId,
        seasonNumber,
        episodeNumber,
        durationMinutes: durationMinutes ?? null,
        seriesTitle: seriesTitle ?? null,
      },
    });

    let title = await prisma.title.findUnique({
      where: { tmdbId: tmdbSeriesId },
    });

    if (!title) {
      title = await prisma.title.create({
        data: {
          tmdbId: tmdbSeriesId,
          titlePL: seriesTitle ?? `Serial ${tmdbSeriesId}`,
          titleOriginal: seriesTitle ?? null,
          mediaType: "tv",
          posterUrl: null,
          year: null,
          genres: "[]",
          runtime: null,
        },
      });
    }

    await prisma.userTitle.upsert({
      where: { userId_titleId: { userId, titleId: title.id } },
      update: {},
      create: {
        userId,
        titleId: title.id,
        watched: false,
        favorite: false,
        rating: null,
      },
    });
  } else {
    await prisma.userEpisode.deleteMany({
      where: { userId, tmdbSeriesId, seasonNumber, episodeNumber },
    });
  }

  return NextResponse.json({ ok: true });
}