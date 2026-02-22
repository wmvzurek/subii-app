import { NextResponse } from "next/server";
import axios from "axios";

export async function GET() {
  try {
    const [moviesRes, tvRes] = await Promise.all([
      axios.get("https://api.themoviedb.org/3/movie/now_playing", {
        params: {
          api_key: process.env.TMDB_API_KEY,
          language: "pl-PL",
          page: 1,
          region: "PL",
        },
      }),
      axios.get("https://api.themoviedb.org/3/tv/on_the_air", {
        params: {
          api_key: process.env.TMDB_API_KEY,
          language: "pl-PL",
          page: 1,
        },
      }),
    ]);

    const movies = (moviesRes.data.results || [])
      .filter((m: { poster_path: string | null }) => m.poster_path)
      .slice(0, 10)
      .map((m: {
        id: number;
        title: string;
        poster_path: string;
        release_date: string;
        vote_average: number;
      }) => ({
        id: m.id,
        title: m.title,
        posterUrl: `https://image.tmdb.org/t/p/w342${m.poster_path}`,
        year: m.release_date?.slice(0, 4) || null,
        mediaType: "movie",
        rating: m.vote_average,
      }));

    const tvShows = (tvRes.data.results || [])
      .filter((t: { poster_path: string | null }) => t.poster_path)
      .slice(0, 10)
      .map((t: {
        id: number;
        name: string;
        poster_path: string;
        first_air_date: string;
        vote_average: number;
      }) => ({
        id: t.id,
        title: t.name,
        posterUrl: `https://image.tmdb.org/t/p/w342${t.poster_path}`,
        year: t.first_air_date?.slice(0, 4) || null,
        mediaType: "tv",
        rating: t.vote_average,
      }));

    // Mieszamy filmy i seriale i bierzemy 10
    const mixed: typeof movies = [];
    let mi = 0, ti = 0;
    while (mixed.length < 10 && (mi < movies.length || ti < tvShows.length)) {
      if (mi < movies.length) mixed.push(movies[mi++]);
      if (mixed.length < 10 && ti < tvShows.length) mixed.push(tvShows[ti++]);
    }

    return NextResponse.json({ newTitles: mixed });
  } catch {
    return NextResponse.json({ newTitles: [] }, { status: 500 });
  }
}