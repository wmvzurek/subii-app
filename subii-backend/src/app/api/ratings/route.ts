import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

interface OMDbRating {
  Source: string;
  Value: string;
}

interface OMDbResponse {
  imdbRating?: string;
  Ratings?: OMDbRating[];
  Metascore?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imdbId = searchParams.get("imdbId");

  if (!imdbId) {
    return NextResponse.json({ error: "imdbId required" }, { status: 400 });
  }

  try {
    const res = await axios.get<OMDbResponse>("http://www.omdbapi.com/", {
      params: {
        apikey: process.env.OMDB_API_KEY,
        i: imdbId,
      }
    });

    const rtRating = res.data.Ratings?.find(r => r.Source === "Rotten Tomatoes");

    return NextResponse.json({
      imdbRating: res.data.imdbRating,
      rtScore: rtRating?.Value,
      metascore: res.data.Metascore,
    });
  } catch (err) {
    console.error("[/api/ratings] error:", err);
    return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 });
  }
}