import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  
  if (!q) return NextResponse.json({ results: [] });

  try {
    // 1) Wyszukaj w TMDB
    const tmdbRes = await axios.get("https://api.themoviedb.org/3/search/multi", {
      params: { 
        api_key: process.env.TMDB_API_KEY, 
        query: q, 
        language: "pl-PL" 
      },
    });

    const results = tmdbRes.data.results;

    // 2) Zapisz do cache w DB (upsert)
    for (const item of results.slice(0, 10)) {
      if (item.media_type === "movie" || item.media_type === "tv") {
        await prisma.title.upsert({
          where: { tmdbId: item.id },
          update: {
            titlePL: item.title || item.name,
            titleOriginal: item.original_title || item.original_name,
            year: item.release_date ? new Date(item.release_date).getFullYear() : null,
            plot: item.overview,
            posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            genres: JSON.stringify(item.genre_ids || []),
          },
          create: {
            tmdbId: item.id,
            titlePL: item.title || item.name,
            titleOriginal: item.original_title || item.original_name,
            year: item.release_date ? new Date(item.release_date).getFullYear() : null,
            plot: item.overview,
            posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            genres: JSON.stringify(item.genre_ids || []),
          },
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[/api/search] error:", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}