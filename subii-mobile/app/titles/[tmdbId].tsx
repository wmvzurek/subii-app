import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  View, Text, Image, Pressable, ScrollView,
  ActivityIndicator,
} from "react-native";
import { api, subscriptionsApi } from "../../src/lib/api";
import { getProviderLogo, getProviderName } from "../../src/lib/provider-logos";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const OFFER_TYPE_LABELS: Record<string, string> = {
  subscription: "W abonamencie",
  rent: "Do wypożyczenia",
  buy: "Do kupienia",
  free: "Bezpłatnie",
};

export default function TitleScreen() {
  const { tmdbId, mediaType } = useLocalSearchParams<{ tmdbId: string; mediaType?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [details, setDetails] = useState<any>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeProviders, setActiveProviders] = useState<string[]>([]);

  useEffect(() => {
    loadAll();
  }, [tmdbId]);

  const loadAll = async () => {
    try {
      const providers = await subscriptionsApi.getActiveProviderCodes();
      setActiveProviders(providers);

      const d = await api.get(`/api/title/${tmdbId}`, {
  params: mediaType ? { mediaType } : {},
});
      setDetails(d.data);

      const year = d.data.release_date?.slice(0, 4) || d.data.first_air_date?.slice(0, 4);
      const a = await api.get(`/api/availability`, {
        params: { title: d.data.title || d.data.name, year, tmdbId: String(tmdbId) },
      });
      setAvailability(a.data.sources || []);

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


  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Plakat */}
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
              {year && <Text style={{ fontSize: 13, color: "#666" }}>{year}</Text>}
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
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
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
      {availability.map((s: any, idx: number) => {
        const providerCode = s.providerCode;
        const logo = providerCode ? getProviderLogo(providerCode) : null;
        const isOwned = activeProviders.includes(providerCode);
        const canSubscribe = !isOwned && !!providerCode;

        const typeLabel: Record<string, string> = {
          subscription: "W abonamencie",
          rent:         "Do wypożyczenia",
          buy:          "Do kupienia",
          free:         "Bezpłatnie",
        };

        const cheapestPlan = s.cheapestPlan;

        return (
          <Pressable
            key={idx}
            onPress={() => {
              if (canSubscribe && providerCode) {
                router.push(`/subscriptions-select-plan?provider=${providerCode}` as any);
              }
            }}
            style={({ pressed }) => ({
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
              borderWidth: isOwned ? 1.5 : canSubscribe ? 1 : 0,
              borderColor: isOwned
                ? "rgba(134,239,172,0.6)"
                : canSubscribe
                ? "#e0e0e0"
                : "transparent",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {/* Logo platformy — bez nazwy tekstowej */}
            <View style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              backgroundColor: "#f5f5f5",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}>
              {logo ? (
                <Image
                  source={logo}
                  style={{ width: 44, height: 44, resizeMode: "contain" }}
                />
              ) : (
                <Text style={{ fontSize: 22 }}>🎬</Text>
              )}
            </View>

            {/* Środek — typ + plan + cena */}
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontSize: 13, color: "#999", fontWeight: "500" }}>
                {typeLabel[s.type] || s.type}
              </Text>

              {s.type === "subscription" && cheapestPlan ? (
                <>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>
                    {cheapestPlan.planName}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#555" }}>
                    {cheapestPlan.pricePLN % 1 === 0
                      ? `${cheapestPlan.pricePLN} zł/mies.`
                      : `${cheapestPlan.pricePLN.toFixed(2)} zł/mies.`}
                  </Text>
                </>
              ) : s.type === "rent" || s.type === "buy" ? (
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>
                  {getProviderName(providerCode)}
                </Text>
              ) : null}
            </View>

            {/* Prawy badge — masz dostęp / wykup */}
            <View>
              {isOwned ? (
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "rgba(134,239,172,0.15)",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 20,
                }}>
                  <Text style={{ fontSize: 12, color: "#16a34a", fontWeight: "700" }}>
                    ✓ Masz dostęp
                  </Text>
                </View>
              ) : canSubscribe ? (
                <View style={{
                  backgroundColor: "#000",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}>
                  <Text style={{ fontSize: 12, color: "#fff", fontWeight: "700" }}>
                    Wykup dostęp
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  )}
</View>

          {/* Obsada */}
          {details.credits?.cast?.length > 0 && (
            <View>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#000", marginBottom: 10 }}>
                Obsada
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 14 }}
              >
                {details.credits.cast.slice(0, 10).map((actor: any) => (
                  <Pressable
                    key={actor.id}
                    onPress={() => router.push({
                      pathname: "/person/[personId]",
                      params: { personId: String(actor.id) },
                    } as any)}
                    style={{ alignItems: "center", width: 72 }}
                  >
                    {actor.profile_path ? (
                      <Image
                        source={{ uri: `https://image.tmdb.org/t/p/w185${actor.profile_path}` }}
                        style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 6 }}
                      />
                    ) : (
                      <View style={{
                        width: 64, height: 64, borderRadius: 32,
                        backgroundColor: "#e0e0e0", marginBottom: 6,
                        justifyContent: "center", alignItems: "center",
                      }}>
                        <Text style={{ fontSize: 26 }}>👤</Text>
                      </View>
                    )}
                    <Text
                      style={{ fontSize: 11, fontWeight: "600", color: "#000", textAlign: "center" }}
                      numberOfLines={2}
                    >
                      {actor.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
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

        </View>
      </ScrollView>
    </View>
  );
}