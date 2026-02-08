import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(_: NextRequest, { params }: { params: { tmdbId: string } }) {
  const r = await axios.get(`https://api.themoviedb.org/3/movie/${params.tmdbId}`, {
    params: { api_key: process.env.TMDB_API_KEY, append_to_response: "credits,images", language: "pl-PL" },
  });
  return NextResponse.json(r.data);
}
