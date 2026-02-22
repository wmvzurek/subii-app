import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  View, Text, Image, Pressable, ScrollView,
  ActivityIndicator, Linking,
} from "react-native";
import { api } from "../../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PROVIDER_NAMES: Record<string, string> = {
  netflix: "Netflix",
  disney_plus: "Disney+",
  prime_video: "Prime Video",
  hbo_max: "Max",
  apple_tv: "Apple TV+",
};

const OFFER_TYPE_LABELS: Record<string, string> = {
  subscription: "W abonamencie",
  rent: "Do wypożyczenia",
  buy: "Do kupienia",
  free: "Bezpłatnie",
};

export default function TitleScreen() {
  const { tmdbId } = useLocalSearchParams<{ tmdbId: string }>();
  console.log("TitleScreen loaded, tmdbId:", tmdbId);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [details, setDetails] = useState<any>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [tmdbId]);

  const loadAll = async () => {
    try {
      // 1) Szczegóły TMDB
      const d = await api.get(`/api/title/${tmdbId}`);
      console.log("Title data:", d.data.title, d.data.name, d.data.media_type);
      setDetails(d.data);

      // 2) Dostępność (Watchmode)
      const year = d.data.release_date?.slice(0, 4) || d.data.first_air_date?.slice(0, 4);
const a = await api.get(`/api/availability`, {
  params: { title: d.data.title || d.data.name, year, tmdbId: String(tmdbId) },
});
      console.log("Availability search title:", d.data.title || d.data.name);
console.log("Availability sources:", a.data.sources);
      setAvailability(a.data.sources || []);

      // 3) Oceny (OMDb) — tylko jeśli mamy imdb_id
      if (d.data.imdb_id) {
        try {
          const r = await api.get(`/api/ratings`, {
            params: { imdbId: d.data.imdb_id },
          });
          setRatings(r.data);
        } catch {
          // oceny opcjonalne
        }
      }
    } catch {
      // błąd ładowania
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#999" }}>Nie znaleziono tytułu</Text>
      </View>
    );
  }

  const title = details.title || details.name;
  const year = details.release_date?.slice(0, 4) || details.first_air_date?.slice(0, 4);
  const runtime = details.runtime
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}min`
    : details.episode_run_time?.[0]
    ? `${details.episode_run_time[0]} min / odcinek`
    : null;

  const genres = (details.genres || []).map((g: any) => g.name).join(", ");

  // Grupuj dostępność po providerze
  const grouped: Record<string, any[]> = {};
  for (const s of availability) {
    const key = s.name || "Inne";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Plakat + gradient */}
        <View style={{ position: "relative" }}>
          {details.backdrop_path ? (
            <Image
              source={{ uri: `https://image.tmdb.org/t/p/w780${details.backdrop_path}` }}
              style={{ width: "100%", height: 220 }}
            />
          ) : details.poster_path ? (
            <Image
              source={{ uri: `https://image.tmdb.org/t/p/w780${details.poster_path}` }}
              style={{ width: "100%", height: 220 }}
            />
          ) : (
            <View style={{ width: "100%", height: 220, backgroundColor: "#222", justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 64 }}>🎬</Text>
            </View>
          )}

          {/* Przycisk wstecz */}
          <Pressable
            onPress={() => router.back()}
            style={{
              position: "absolute",
              top: insets.top + 10,
              left: 16,
              width: 36, height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18 }}>←</Text>
          </Pressable>
        </View>

        <View style={{ padding: 20, gap: 16 }}>

          {/* Tytuł + meta */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 26, fontWeight: "900", color: "#000", lineHeight: 32 }}>
              {title}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {year && (
                <Text style={{ fontSize: 13, color: "#666" }}>{year}</Text>
              )}
              {runtime && (
                <>
                  <Text style={{ color: "#ccc" }}>·</Text>
                  <Text style={{ fontSize: 13, color: "#666" }}>{runtime}</Text>
                </>
              )}
              {genres ? (
                <>
                  <Text style={{ color: "#ccc" }}>·</Text>
                  <Text style={{ fontSize: 13, color: "#666" }}>{genres}</Text>
                </>
              ) : null}
            </View>
          </View>

          {/* Oceny */}
          {(ratings?.imdbRating || ratings?.rtScore || details.vote_average > 0) && (
            <View style={{
              flexDirection: "row", gap: 10, flexWrap: "wrap",
            }}>
              {details.vote_average > 0 && (
                <View style={{
                  backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 12,
                  paddingVertical: 8, alignItems: "center",
                  shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
                }}>
                  <Text style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>TMDB</Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#000" }}>
                    ⭐ {details.vote_average.toFixed(1)}
                  </Text>
                </View>
              )}
              {ratings?.imdbRating && ratings.imdbRating !== "N/A" && (
                <View style={{
                  backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 12,
                  paddingVertical: 8, alignItems: "center",
                  shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
                }}>
                  <Text style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>IMDb</Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#f59e0b" }}>
                    {ratings.imdbRating}
                  </Text>
                </View>
              )}
              {ratings?.rtScore && ratings.rtScore !== "N/A" && (
                <View style={{
                  backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 12,
                  paddingVertical: 8, alignItems: "center",
                  shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
                }}>
                  <Text style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>Rotten Tomatoes</Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#dc2626" }}>
                    🍅 {ratings.rtScore}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Opis */}
          {details.overview ? (
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#000", marginBottom: 8 }}>
                Opis
              </Text>
              <Text style={{ fontSize: 14, color: "#555", lineHeight: 22 }}>
                {details.overview}
              </Text>
            </View>
          ) : null}

          {/* Obsada */}
          {details.credits?.cast?.length > 0 && (
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#000", marginBottom: 4 }}>
                Obsada
              </Text>
              <Text style={{ fontSize: 13, color: "#666", lineHeight: 22 }}>
                {details.credits.cast.slice(0, 5).map((c: any) => c.name).join(", ")}
              </Text>
            </View>
          )}

          {/* Reżyser */}
          {details.credits?.crew?.length > 0 && (() => {
            const director = details.credits.crew.find((c: any) => c.job === "Director");
            if (!director) return null;
            return (
              <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#000", marginBottom: 4 }}>
                  Reżyseria
                </Text>
                <Text style={{ fontSize: 13, color: "#666" }}>{director.name}</Text>
              </View>
            );
          })()}

          {/* Gdzie obejrzeć */}
          <View>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#000", marginBottom: 10 }}>
              Gdzie obejrzeć
            </Text>

            {availability.length === 0 ? (
  <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, alignItems: "center" }}>
    <Text style={{ fontSize: 14, color: "#999" }}>
      Brak danych o dostępności w Polsce
    </Text>
  </View>
) : (
  <View style={{ gap: 10 }}>
    {availability.map((s: any, idx: number) => (
      <Pressable
        key={idx}
        onPress={() => s.web_url && Linking.openURL(s.web_url)}
        style={{
          backgroundColor: "#fff",
          borderRadius: 14,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Logo platformy */}
        {s.logo_url ? (
          <Image
            source={{ uri: s.logo_url }}
            style={{ width: 44, height: 44, borderRadius: 10 }}
          />
        ) : (
          <View style={{
            width: 44, height: 44, borderRadius: 10,
            backgroundColor: "#f0f0f0",
            justifyContent: "center", alignItems: "center"
          }}>
            <Text style={{ fontSize: 20 }}>📺</Text>
          </View>
        )}

        {/* Nazwa + typ */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#000" }}>
            {s.name}
          </Text>
          <Text style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
            {OFFER_TYPE_LABELS[s.type] || s.type}
          </Text>
        </View>

        {/* Cena lub badge */}
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          {s.type === "subscription" ? (
            <View style={{
              paddingHorizontal: 8, paddingVertical: 4,
              backgroundColor: "rgba(134,239,172,0.2)",
              borderRadius: 8, borderWidth: 1,
              borderColor: "rgba(134,239,172,0.4)"
            }}>
              <Text style={{ fontSize: 11, color: "#16a34a", fontWeight: "700" }}>
                ABONAMENT
              </Text>
            </View>
          ) : s.price ? (
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#000" }}>
              {parseFloat(s.price).toFixed(2)} zł
            </Text>
          ) : null}
          {s.web_url && (
            <Text style={{ fontSize: 12, color: "#007aff", fontWeight: "600" }}>
              Otwórz →
            </Text>
          )}
        </View>
      </Pressable>
    ))}
  </View>
)}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}