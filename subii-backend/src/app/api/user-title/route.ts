import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tmdbId = Number(searchParams.get("tmdbId"));

  if (!tmdbId) {
    return NextResponse.json({ error: "tmdbId required" }, { status: 400 });
  }

  const title = await prisma.title.findUnique({ where: { tmdbId } });

  if (!title) {
    return NextResponse.json({
      watched: false,
      favorite: false,
      episodes: [],
    });
  }

  const userTitle = await prisma.userTitle.findUnique({
    where: { userId_titleId: { userId, titleId: title.id } },
  });

  const episodes = await prisma.userEpisode.findMany({
    where: { userId, tmdbSeriesId: tmdbId },
    select: { seasonNumber: true, episodeNumber: true, durationMinutes: true },
  });

  return NextResponse.json({
    watched: userTitle?.watched ?? false,
    favorite: userTitle?.favorite ?? false,
    rating: userTitle?.rating ?? null,
    episodes,
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    tmdbId,
    mediaType,
    titlePL,
    titleOriginal,
    year,
    posterUrl,
    genres,
    watched,
    favorite,
  } = body;

  if (!tmdbId) {
    return NextResponse.json({ error: "tmdbId required" }, { status: 400 });
  }

  const parsedTmdbId = Number(tmdbId);
  if (isNaN(parsedTmdbId) || parsedTmdbId <= 0) {
    return NextResponse.json({ error: "Nieprawidłowe tmdbId" }, { status: 400 });
  }

  if (body.rating !== undefined && body.rating !== null) {
    const rating = Number(body.rating);
    if (isNaN(rating) || rating < 1 || rating > 10) {
      return NextResponse.json(
        { error: "Ocena musi być liczbą między 1 a 10" },
        { status: 400 }
      );
    }
  }

  const title = await prisma.title.upsert({
    where: { tmdbId },
    update: {
      ...(body.runtime !== undefined && { runtime: body.runtime }),
    },
    create: {
      tmdbId,
      titlePL: titlePL || "",
      titleOriginal: titleOriginal || "",
      year: year || null,
      posterUrl: posterUrl || null,
      genres: genres || "[]",
      runtime: body.runtime || null,
    },
  });

  const data: Record<string, boolean | number | Date> = { updatedAt: new Date() };
  if (watched !== undefined) data.watched = watched;
  if (favorite !== undefined) data.favorite = favorite;
  if (body.rating !== undefined && body.rating !== null) data.rating = Number(body.rating);

  const userTitle = await prisma.userTitle.upsert({
    where: { userId_titleId: { userId, titleId: title.id } },
    update: data,
    create: {
      userId,
      titleId: title.id,
      watched: watched ?? false,
      favorite: favorite ?? false,
    },
  });

  return NextResponse.json({
    watched: userTitle.watched,
    favorite: userTitle.favorite,
  });
}