import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  View, Text, Image, Pressable, ScrollView,
  ActivityIndicator, TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
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
 const [userTitleState, setUserTitleState] = useState<{ watched: boolean; favorite: boolean; rating?: number }>({ watched: false, favorite: false });
  const [watchedEpisodes, setWatchedEpisodes] = useState<{seasonNumber: number, episodeNumber: number, durationMinutes: number | null}[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [expandedSeasons, setExpandedSeasons] = useState<number[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);

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
      // Stan watched/favorite użytkownika
      try {
        const ut = await api.get(`/api/user-title`, { params: { tmdbId } });
        setUserTitleState({ watched: ut.data.watched, favorite: ut.data.favorite, rating: ut.data.rating });
        setWatchedEpisodes(ut.data.episodes || []);
      } catch {
        // brak stanu = domyślne false
      }

      // Dla seriali załaduj sezony
      if (d.data.media_type === "tv" || d.data.first_air_date) {
        setSeasonsLoading(true);
        try {
          const sv = await api.get(`/api/tv-seasons`, { params: { tmdbId } });
          setSeasons(sv.data.seasons || []);
        } catch {
          // brak sezonów
        } finally {
          setSeasonsLoading(false);
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
  const isMovie = !!(details.title && !details.first_air_date) || details.media_type === "movie";

  const submitRating = async (rating: number) => {
    setShowRatingModal(false);
    setSelectedRating(rating);
    setUserTitleState(prev => ({ ...prev, rating }));
    try {
      await api.patch(`/api/user-title`, {
        tmdbId: Number(tmdbId),
        titlePL: details.title || details.name || "",
        titleOriginal: details.original_title || details.original_name || "",
        year: Number(details.release_date?.slice(0, 4) || details.first_air_date?.slice(0, 4) || 0),
        posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
        genres: JSON.stringify((details.genres || []).map((g: any) => g.id)),
        rating,
      });

      // Zapisz słowa kluczowe w tle
      const mediaType = isMovie ? "movie" : "tv";
      try {
        const kwRes = await api.get(`/api/title-keywords`, {
          params: { tmdbId, mediaType },
        });
        console.log("keywords saved", kwRes.data);
      } catch {
        // opcjonalne
      }
    } catch {
      // błąd zapisu oceny
    }
  };

  const toggleFavorite = async () => {
    const newVal = !userTitleState.favorite;
    setUserTitleState(prev => ({ ...prev, favorite: newVal }));
    try {
      await api.patch(`/api/user-title`, {
        tmdbId: Number(tmdbId),
        titlePL: details.title || details.name || "",
        titleOriginal: details.original_title || details.original_name || "",
        year: Number(details.release_date?.slice(0, 4) || details.first_air_date?.slice(0, 4) || 0),
        posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
        genres: JSON.stringify((details.genres || []).map((g: any) => g.id)),
        favorite: newVal,
      });
    } catch {
      setUserTitleState(prev => ({ ...prev, favorite: !newVal }));
    }
  };

  const toggleMovieWatched = async () => {
    const newVal = !userTitleState.watched;
    setUserTitleState(prev => ({ ...prev, watched: newVal }));
    // Pokaż modal tylko przy pierwszym zaznaczeniu
    if (newVal && !userTitleState.rating) {
      setShowRatingModal(true);
    }
    try {
      await api.patch(`/api/user-title`, {
        tmdbId: Number(tmdbId),
        titlePL: details.title || details.name || "",
        titleOriginal: details.original_title || details.original_name || "",
        year: Number(details.release_date?.slice(0, 4) || 0),
        posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
        genres: JSON.stringify((details.genres || []).map((g: any) => g.id)),
        watched: newVal,
      });
    } catch {
      setUserTitleState(prev => ({ ...prev, watched: !newVal }));
    }
  };

  const isEpisodeWatched = (seasonNum: number, episodeNum: number) =>
    watchedEpisodes.some(e => e.seasonNumber === seasonNum && e.episodeNumber === episodeNum);

  const isSeasonWatched = (season: any) =>
    season.episodes.length > 0 &&
    season.episodes.every((ep: any) => isEpisodeWatched(season.seasonNumber, ep.episodeNumber));

  const toggleEpisode = async (season: any, episode: any) => {
    const nowWatched = !isEpisodeWatched(season.seasonNumber, episode.episodeNumber);
    if (nowWatched) {
      setWatchedEpisodes(prev => [...prev, {
        seasonNumber: season.seasonNumber,
        episodeNumber: episode.episodeNumber,
        durationMinutes: episode.runtime,
      }]);
    } else {
      setWatchedEpisodes(prev => prev.filter(
        e => !(e.seasonNumber === season.seasonNumber && e.episodeNumber === episode.episodeNumber)
      ));
    }
    try {
      await api.post(`/api/user-episode`, {
        tmdbSeriesId: Number(tmdbId),
        seasonNumber: season.seasonNumber,
        episodeNumber: episode.episodeNumber,
        durationMinutes: episode.runtime || null,
        watched: nowWatched,
      });
    } catch {
      // rollback
      if (nowWatched) {
        setWatchedEpisodes(prev => prev.filter(
          e => !(e.seasonNumber === season.seasonNumber && e.episodeNumber === episode.episodeNumber)
        ));
      } else {
        setWatchedEpisodes(prev => [...prev, {
          seasonNumber: season.seasonNumber,
          episodeNumber: episode.episodeNumber,
          durationMinutes: episode.runtime,
        }]);
      }
    }

    // Sprawdź czy wszystkie odcinki wszystkich sezonów są zaznaczone
    if (nowWatched) {
      const totalEpisodes = seasons.reduce((sum, s) => sum + s.episodes.length, 0);
      const newWatchedCount = watchedEpisodes.filter(
        e => !(e.seasonNumber === season.seasonNumber && e.episodeNumber === episode.episodeNumber)
      ).length + 1;
      if (totalEpisodes > 0 && newWatchedCount >= totalEpisodes && !userTitleState.rating) {
        setShowRatingModal(true);
      }
    }
  };

  const toggleSeason = async (season: any) => {
    const allWatched = isSeasonWatched(season);
    const newWatched = !allWatched;
    if (newWatched) {
      const toAdd = season.episodes
        .filter((ep: any) => !isEpisodeWatched(season.seasonNumber, ep.episodeNumber))
        .map((ep: any) => ({
          seasonNumber: season.seasonNumber,
          episodeNumber: ep.episodeNumber,
          durationMinutes: ep.runtime,
        }));
      setWatchedEpisodes(prev => [...prev, ...toAdd]);
    } else {
      setWatchedEpisodes(prev => prev.filter(e => e.seasonNumber !== season.seasonNumber));
    }
    try {
      await Promise.all(
        season.episodes.map((ep: any) =>
          api.post(`/api/user-episode`, {
            tmdbSeriesId: Number(tmdbId),
            seasonNumber: season.seasonNumber,
            episodeNumber: ep.episodeNumber,
            durationMinutes: ep.runtime || null,
            watched: newWatched,
          })
        )
      );
    } catch {
      const ut = await api.get(`/api/user-title`, { params: { tmdbId } });
      setWatchedEpisodes(ut.data.episodes || []);
    }
  };
  const formatWatchedTime = () => {
    if (isMovie) {
      if (!userTitleState.watched) return null;
      const mins = details.runtime;
      if (!mins) return "Obejrzane";
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `Obejrzano · ${h}h ${m}min` : `Obejrzano · ${m}min`;
    } else {
      const count = watchedEpisodes.length;
      if (count === 0) return null;
      const totalMins = watchedEpisodes.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      const timeStr = totalMins > 0
        ? (h > 0 ? ` · ${h}h ${m}min` : ` · ${m}min`)
        : "";
      return `Obejrzano: ${count} ${count === 1 ? "odcinek" : count < 5 ? "odcinki" : "odcinków"}${timeStr}`;
    }
  };

  const watchedSummary = formatWatchedTime();

  const toggleExpanded = (seasonNum: number) => {
    setExpandedSeasons(prev =>
      prev.includes(seasonNum) ? prev.filter(n => n !== seasonNum) : [...prev, seasonNum]
    );
  };


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

          <Pressable
            onPress={toggleFavorite}
            style={{
              position: "absolute",
              top: insets.top + 10,
              right: 16,
              width: 36, height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name={userTitleState.favorite ? "favorite" : "favorite-border"}
              size={20}
              color={userTitleState.favorite ? "#ef4444" : "#fff"}
            />
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
          {/* Checkbox "Obejrzane" — tylko dla filmów */}
          {isMovie && (
            <TouchableOpacity
              onPress={toggleMovieWatched}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: userTitleState.watched ? "#000" : "#fff",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                shadowColor: "#000",
                shadowOpacity: 0.07,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <MaterialIcons
                name={userTitleState.watched ? "check-box" : "check-box-outline-blank"}
                size={22}
                color={userTitleState.watched ? "#fff" : "#000"}
              />
              <Text style={{
                fontSize: 14,
                fontWeight: "700",
                color: userTitleState.watched ? "#fff" : "#000",
              }}>
                {userTitleState.watched ? "Obejrzane ✓" : "Oznacz jako obejrzane"}
              </Text>
            </TouchableOpacity>
          )}

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
          {/* Sekcja sezonów — tylko dla seriali */}
          {!isMovie && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#000" }}>
                Odcinki
              </Text>
              {seasonsLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                seasons.map((season) => (
                  <View key={season.seasonNumber} style={{
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    overflow: "hidden",
                    shadowColor: "#000",
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                  }}>
                    <TouchableOpacity
                      onPress={() => toggleExpanded(season.seasonNumber)}
                      style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 10 }}
                    >
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); toggleSeason(season); }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialIcons
                          name={isSeasonWatched(season) ? "check-box" : "check-box-outline-blank"}
                          size={22}
                          color="#000"
                        />
                      </TouchableOpacity>
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: "#000" }}>
                        {season.name || `Sezon ${season.seasonNumber}`}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#999" }}>
                        {season.episodes.filter((ep: any) =>
                          isEpisodeWatched(season.seasonNumber, ep.episodeNumber)
                        ).length}/{season.episodes.length}
                      </Text>
                      <MaterialIcons
                        name={expandedSeasons.includes(season.seasonNumber) ? "expand-less" : "expand-more"}
                        size={22}
                        color="#999"
                      />
                    </TouchableOpacity>

                    {expandedSeasons.includes(season.seasonNumber) && (
                      <View style={{ borderTopWidth: 1, borderTopColor: "#f0f0f0" }}>
                        {season.episodes.map((episode: any) => (
                          <TouchableOpacity
                            key={episode.episodeNumber}
                            onPress={() => toggleEpisode(season, episode)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingVertical: 10,
                              paddingHorizontal: 14,
                              gap: 10,
                              borderBottomWidth: 1,
                              borderBottomColor: "#f9f9f9",
                            }}
                          >
                            <MaterialIcons
                              name={isEpisodeWatched(season.seasonNumber, episode.episodeNumber)
                                ? "check-box"
                                : "check-box-outline-blank"}
                              size={20}
                              color={isEpisodeWatched(season.seasonNumber, episode.episodeNumber)
                                ? "#000"
                                : "#bbb"}
                            />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{ fontSize: 13, fontWeight: "600", color: "#000" }}
                                numberOfLines={1}
                              >
                                {episode.episodeNumber}. {episode.name}
                              </Text>
                              {episode.runtime ? (
                                <Text style={{ fontSize: 11, color: "#999", marginTop: 1 }}>
                                  {episode.runtime} min
                                </Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

        </View>
      </ScrollView>
      {/* Modal oceny */}
      {showRatingModal && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center", alignItems: "center",
          zIndex: 999,
        }}>
          <View style={{
            backgroundColor: "#fff", borderRadius: 20,
            padding: 28, marginHorizontal: 30, width: "85%",
            alignItems: "center", gap: 16,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#000", textAlign: "center" }}>
              Jak oceniasz ten tytuł?
            </Text>
            <Text style={{ fontSize: 13, color: "#999", textAlign: "center" }}>
              Twoja ocena pomoże nam polecić Ci lepsze tytuły
            </Text>

            {/* Gwiazdki */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setSelectedRating(star)}>
                  <Text style={{ fontSize: 36 }}>
                    {star <= selectedRating ? "⭐" : "☆"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Przyciski */}
            <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
              <Pressable
                onPress={() => setShowRatingModal(false)}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 10,
                  backgroundColor: "#f0f0f0", alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#666" }}>Pomiń</Text>
              </Pressable>
              <Pressable
                onPress={() => selectedRating > 0 && submitRating(selectedRating)}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 10,
                  backgroundColor: selectedRating > 0 ? "#000" : "#ccc",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>Zapisz</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}