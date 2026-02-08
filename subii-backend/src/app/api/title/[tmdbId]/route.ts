import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(
  _: NextRequest, 
  { params }: { params: Promise<{ tmdbId: string }> }
) {
  // Next.js 15: params jest Promise
  const { tmdbId } = await params;

  try {
    const r = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}`, {
      params: { 
        api_key: process.env.TMDB_API_KEY, 
        append_to_response: "credits,images", 
        language: "pl-PL" 
      },
    });

    return NextResponse.json(r.data);
  } catch (error) {
    console.error(`[/api/title/${tmdbId}] error:`, error);
    
    // Jeśli 404, spróbuj jako serial (tv)
    try {
      const tvRes = await axios.get(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
        params: { 
          api_key: process.env.TMDB_API_KEY, 
          append_to_response: "credits,images", 
          language: "pl-PL" 
        },
      });
      return NextResponse.json(tvRes.data);
    } catch {
      return NextResponse.json({ error: "Title not found" }, { status: 404 });
    }
  }
}