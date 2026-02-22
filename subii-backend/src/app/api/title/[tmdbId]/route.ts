import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  const { tmdbId } = await params;

  // Sprawdź najpierw tv, potem movie
  // (unikamy problemu gdy ten sam id istnieje w obu bazach)
  try {
    const tvRes = await axios.get(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
      params: {
        api_key: process.env.TMDB_API_KEY,
        append_to_response: "credits,external_ids",
        language: "pl-PL",
      },
    });
    // Sprawdź czy to naprawdę serial (ma name, nie title)
    if (tvRes.data.name) {
      return NextResponse.json({ ...tvRes.data, media_type: "tv" });
    }
  } catch {
    // nie serial — spróbuj movie
  }

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