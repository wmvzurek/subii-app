import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const year = searchParams.get("year") || "";

  if (!title) return NextResponse.json({ sources: [] });

  try {
    // 1) Wyszukaj w Watchmode
    const searchRes = await axios.get("https://api.watchmode.com/v1/search/", {
      params: { 
        apiKey: process.env.WATCHMODE_API_KEY, 
        search_field: "name", 
        search_value: title, 
        year 
      }
    });

    const first = searchRes.data.title_results?.[0];
    if (!first) return NextResponse.json({ sources: [] });

    // 2) Pobierz źródła
    const sourcesRes = await axios.get(`https://api.watchmode.com/v1/title/${first.id}/sources/`, {
      params: { 
        apiKey: process.env.WATCHMODE_API_KEY, 
        regions: "PL" 
      }
    });

    const sources = sourcesRes.data || [];

    // 3) Znajdź Title w DB
    const titleRecord = await prisma.title.findFirst({
      where: { titlePL: title }
    });

    if (titleRecord) {
      // 4) Zapisz availability do DB
      for (const source of sources.slice(0, 5)) {
        const existing = await prisma.availability.findFirst({
          where: {
            titleId: titleRecord.id,
            providerCode: mapWatchmodeToProvider(source.name),
          }
        });

        if (existing) {
          await prisma.availability.update({
            where: { id: existing.id },
            data: {
              offerType: source.type || "subscription",
              pricePLN: source.price ? parseFloat(source.price) : null,
              quality: source.format || null,
              link: source.web_url || null,
              lastSeenAt: new Date(),
            },
          });
        } else {
          await prisma.availability.create({
            data: {
              titleId: titleRecord.id,
              providerCode: mapWatchmodeToProvider(source.name),
              offerType: source.type || "subscription",
              pricePLN: source.price ? parseFloat(source.price) : null,
              quality: source.format || null,
              link: source.web_url || null,
              region: "PL",
            },
          });
        }
      }
    }

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("[/api/availability] error:", error);
    return NextResponse.json({ sources: [] }, { status: 500 });
  }
}

// Helper: mapuj nazwy Watchmode na kody providerów
function mapWatchmodeToProvider(watchmodeName: string): string {
  const map: Record<string, string> = {
    "Netflix": "netflix",
    "Disney Plus": "disney_plus",
    "Amazon Prime Video": "prime_video",
    "HBO Max": "hbo_max",
    "Apple TV Plus": "apple_tv",
  };
  return map[watchmodeName] || watchmodeName.toLowerCase().replace(/\s+/g, "_");
}