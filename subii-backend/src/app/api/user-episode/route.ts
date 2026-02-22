import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

// POST /api/user-episode
// Body: { tmdbSeriesId, seasonNumber, episodeNumber, durationMinutes, watched }
// watched: true = zaznacz, false = odznacz
export async function POST(req: NextRequest) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tmdbSeriesId, seasonNumber, episodeNumber, durationMinutes, watched } = body;

  if (!tmdbSeriesId || seasonNumber === undefined || episodeNumber === undefined) {
    return NextResponse.json({ error: "Brakuje wymaganych pól" }, { status: 400 });
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
      update: { durationMinutes: durationMinutes ?? null, watchedAt: new Date() },
      create: {
        userId,
        tmdbSeriesId,
        seasonNumber,
        episodeNumber,
        durationMinutes: durationMinutes ?? null,
      },
    });
  } else {
    await prisma.userEpisode.deleteMany({
      where: { userId, tmdbSeriesId, seasonNumber, episodeNumber },
    });
  }

  return NextResponse.json({ ok: true });
}