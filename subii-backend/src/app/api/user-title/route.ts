import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

// GET /api/user-title?tmdbId=123
// Zwraca stan watched, favorite i listę obejrzanych odcinków
export async function GET(req: NextRequest) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tmdbId = Number(searchParams.get("tmdbId"));
  if (!tmdbId) return NextResponse.json({ error: "tmdbId required" }, { status: 400 });

  const title = await prisma.title.findUnique({ where: { tmdbId } });
  if (!title) return NextResponse.json({ watched: false, favorite: false, episodes: [] });

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

// PATCH /api/user-title
// Body: { tmdbId, mediaType, titlePL, titleOriginal, year, posterUrl, genres, watched?, favorite? }
export async function PATCH(req: NextRequest) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tmdbId, mediaType, titlePL, titleOriginal, year, posterUrl, genres, watched, favorite } = body;

  if (!tmdbId) return NextResponse.json({ error: "tmdbId required" }, { status: 400 });

  // Upewnij się że tytuł istnieje w bazie (upsert)
  const title = await prisma.title.upsert({
    where: { tmdbId },
    update: {},
    create: {
      tmdbId,
      titlePL: titlePL || "",
      titleOriginal: titleOriginal || "",
      year: year || null,
      posterUrl: posterUrl || null,
      genres: genres || "[]",
    },
  });

  const data: Record<string, boolean | Date> = { updatedAt: new Date() };
  if (watched !== undefined) data.watched = watched;
  if (favorite !== undefined) data.favorite = favorite;

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

  return NextResponse.json({ watched: userTitle.watched, favorite: userTitle.favorite });
}