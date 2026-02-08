import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const year = searchParams.get("year") || "";

  if (!title) return NextResponse.json({ sources: [] });

  // 1) wyszukaj title_id w Watchmode
  const s = await axios.get("https://api.watchmode.com/v1/search/", {
    params: { apiKey: process.env.WATCHMODE_API_KEY, search_field: "name", search_value: title, year }
  });
  const first = s.data.title_results?.[0];
  if (!first) return NextResponse.json({ sources: [] });

  // 2) pobierz źródła w regionie PL
  const src = await axios.get(`https://api.watchmode.com/v1/title/${first.id}/sources/`, {
    params: { apiKey: process.env.WATCHMODE_API_KEY, regions: "PL" }
  });

  return NextResponse.json({ sources: src.data });
}
