import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q) return NextResponse.json({ results: [] });
  const r = await axios.get("https://api.themoviedb.org/3/search/movie", {
    params: { api_key: process.env.TMDB_API_KEY, query: q, language: "pl-PL" },
  });
  return NextResponse.json({ results: r.data.results });
}
