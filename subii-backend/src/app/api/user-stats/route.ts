import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromRequest } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const userId = getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Suma minut dla filmów (watched = true)
  const watchedMovies = await prisma.userTitle.findMany({
    where: { userId, watched: true },
    include: { title: { select: { runtime: true } } },
  });

  const movieMinutes = watchedMovies.reduce((sum, ut) => {
    return sum + (ut.title.runtime || 0);
  }, 0);

  const movieCount = watchedMovies.length;

  // Suma minut dla seriali (z tabeli user_episodes)
  const episodes = await prisma.userEpisode.findMany({
    where: { userId },
    select: { durationMinutes: true },
  });

  const serialMinutes = episodes.reduce((sum, ep) => {
    return sum + (ep.durationMinutes || 0);
  }, 0);

  const episodeCount = episodes.length;

  return NextResponse.json({
    movies: {
      minutes: movieMinutes,
      count: movieCount,
    },
    series: {
      minutes: serialMinutes,
      episodeCount: episodeCount,
    },
  });
}