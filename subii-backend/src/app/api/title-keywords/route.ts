import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tmdbId = Number(searchParams.get("tmdbId"));
  const mediaType = searchParams.get("mediaType") || "movie";

  if (!tmdbId) return NextResponse.json({ error: "tmdbId required" }, { status: 400 });

  try {
    const res = await axios.get(
      `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/keywords`,
      { params: { api_key: process.env.TMDB_API_KEY } }
    );

    const keywords = res.data.keywords || res.data.results || [];
    const keywordsJson = JSON.stringify(keywords.map((k: { id: number; name: string }) => ({
      id: k.id,
      name: k.name,
    })));

    await prisma.title.updateMany({
      where: { tmdbId },
      data: { keywords: keywordsJson },
    });

    return NextResponse.json({ ok: true, count: keywords.length });
  } catch {
    return NextResponse.json({ error: "Błąd zapisu" }, { status: 500 });
  }
}