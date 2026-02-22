import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  const { personId } = await params;

  try {
    const res = await axios.get(`https://api.themoviedb.org/3/person/${personId}`, {
      params: {
        api_key: process.env.TMDB_API_KEY,
        append_to_response: "movie_credits,tv_credits,images",
        language: "pl-PL",
      },
    });

    return NextResponse.json(res.data);
  } catch {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }
}