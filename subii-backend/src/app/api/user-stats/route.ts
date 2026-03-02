import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const watchedMovies = await prisma.userTitle.findMany({
    where: { userId, watched: true },
    include: { title: { select: { runtime: true } } },
  });

  const movieMinutes = watchedMovies.reduce((sum, ut) => {
    return sum + (ut.title.runtime || 0);
  }, 0);

  const movieCount = watchedMovies.length;

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