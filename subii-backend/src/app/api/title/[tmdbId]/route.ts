import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  const { tmdbId } = await params;
  const { searchParams } = new URL(req.url);
  const mediaType = searchParams.get("mediaType");

  if (mediaType === "tv") {
    try {
      const tvRes = await axios.get(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
        params: {
          api_key: process.env.TMDB_API_KEY,
          append_to_response: "credits,external_ids",
          language: "pl-PL",
        },
      });
      return NextResponse.json({ ...tvRes.data, media_type: "tv" });
    } catch {
      return NextResponse.json({ error: "Title not found" }, { status: 404 });
    }
  }

  if (mediaType === "movie") {
    try {
      const movieRes = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}`, {
        params: {
          api_key: process.env.TMDB_API_KEY,
          append_to_response: "credits,external_ids",
          language: "pl-PL",
        },
      });
      return NextResponse.json({ ...movieRes.data, media_type: "movie" });
    } catch {
      return NextResponse.json({ error: "Title not found" }, { status: 404 });
    }
  }

  // Fallback – brak mediaType, stara logika
  try {
    const tvRes = await axios.get(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
      params: {
        api_key: process.env.TMDB_API_KEY,
        append_to_response: "credits,external_ids",
        language: "pl-PL",
      },
    });
    if (tvRes.data.name) {
      return NextResponse.json({ ...tvRes.data, media_type: "tv" });
    }
  } catch {}

  try {
    const movieRes = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}`, {
      params: {
        api_key: process.env.TMDB_API_KEY,
        append_to_response: "credits,external_ids",
        language: "pl-PL",
      },
    });
    return NextResponse.json({ ...movieRes.data, media_type: "movie" });
  } catch {
    return NextResponse.json({ error: "Title not found" }, { status: 404 });
  }
}