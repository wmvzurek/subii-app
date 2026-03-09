import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { api, subscriptionsApi } from "../../src/lib/api";
import { getProviderLogo, getProviderName } from "../../src/lib/provider-logos";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  useFonts,
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";

const OFFER_TYPE_LABELS: Record<string, string> = {
  subscription: "W abonamencie",
  rent: "Do wypożyczenia",
  buy: "Do kupienia",
  free: "Bezpłatnie",
};

export default function TitleScreen() {
  const { tmdbId, mediaType } = useLocalSearchParams<{
    tmdbId: string;
    mediaType?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    Inter_100Thin,
    Inter_200ExtraLight,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  const BG = "#f5f5f5";
  const WHITE = "#fff";
  const BLACK = "#252729";
  const MUTED = "#666";
  const SUBTLE = "#999";
  const LIGHT_BG = "#f0f0f0";
  const DIVIDER = "#f0f0f0";
  const BORDER = "#f0f0f0";
  const DARK_BG = "#222";
  const SHADOW = "#000";
  const ICON_MUTED = "#ccc";
  const AMBER = "#f59e0b";
  const WATCHED_BG = "rgba(103, 209, 142, 0.39)";
  const WATCHED_CHECK = "#1b8241";

  const FONT_REGULAR = "Inter_400Regular";
  const FONT_MEDIUM = "Inter_500Medium";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";

  const [details, setDetails] = useState<any>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeProviders, setActiveProviders] = useState<string[]>([]);
  const [userTitleState, setUserTitleState] = useState<{
    watched: boolean;
    favorite: boolean;
    rating?: number;
  }>({ watched: false, favorite: false });
  const [watchedEpisodes, setWatchedEpisodes] = useState<
    {
      seasonNumber: number;
      episodeNumber: number;
      durationMinutes: number | null;
    }[]
  >([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [expandedSeasons, setExpandedSeasons] = useState<number[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);

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

      const year =
        d.data.release_date?.slice(0, 4) || d.data.first_air_date?.slice(0, 4);
      const a = await api.get(`/api/availability`, {
        params: {
          title: d.data.title || d.data.name,
          year,
          tmdbId: String(tmdbId),
        },
      });
      setAvailability(a.data.sources || []);

      if (d.data.imdb_id) {
        try {
          const r = await api.get(`/api/ratings`, {
            params: { imdbId: d.data.imdb_id },
          });
          setRatings(r.data);
        } catch {}
      }

      try {
        const ut = await api.get(`/api/user-title`, { params: { tmdbId } });
        setUserTitleState({
          watched: ut.data.watched,
          favorite: ut.data.favorite,
          rating: ut.data.rating,
        });
        setWatchedEpisodes(ut.data.episodes || []);
      } catch {}

      if (d.data.media_type === "tv" || d.data.first_air_date) {
        setSeasonsLoading(true);
        try {
          const sv = await api.get(`/api/tv-seasons`, { params: { tmdbId } });
          setSeasons(sv.data.seasons || []);
        } catch {}
        finally {
          setSeasonsLoading(false);
        }
      }
    } catch {}
    finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: BG,
        }}
      >
        <ActivityIndicator size="large" color={BLACK} />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: SUBTLE, fontFamily: FONT_REGULAR }}>
          Nie znaleziono tytułu
        </Text>
      </View>
    );
  }

  const title = details.title || details.name;
  const year =
    details.release_date?.slice(0, 4) || details.first_air_date?.slice(0, 4);
  const runtime = details.runtime
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}min`
    : details.episode_run_time?.[0]
    ? `${details.episode_run_time[0]} min / odcinek`
    : null;

  const genres = (details.genres || []).map((g: any) => g.name).join(", ");
  const isMovie =
    !!(details.title && !details.first_air_date) ||
    details.media_type === "movie";

  const submitRating = async (rating: number) => {
    setShowRatingModal(false);
    setSelectedRating(rating);
    setUserTitleState((prev) => ({ ...prev, rating }));
    try {
      await api.patch(`/api/user-title`, {
        tmdbId: Number(tmdbId),
        titlePL: details.title || details.name || "",
        titleOriginal: details.original_title || details.original_name || "",
        year: Number(
          details.release_date?.slice(0, 4) ||
            details.first_air_date?.slice(0, 4) ||
            0
        ),
        posterUrl: details.poster_path
          ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
          : null,
        genres: JSON.stringify((details.genres || []).map((g: any) => g.id)),
        runtime: details.runtime || null,
        mediaType: isMovie ? "movie" : "tv",
        rating,
      });

      const mediaType = isMovie ? "movie" : "tv";
      try {
        const kwRes = await api.get(`/api/title-keywords`, {
          params: { tmdbId, mediaType },
        });
        console.log("keywords saved", kwRes.data);
      } catch {}
    } catch {}
  };

  const toggleFavorite = async () => {
    const newVal = !userTitleState.favorite;
    setUserTitleState((prev) => ({ ...prev, favorite: newVal }));
    try {
      await api.patch(`/api/user-title`, {
        tmdbId: Number(tmdbId),
        titlePL: details.title || details.name || "",
        titleOriginal: details.original_title || details.original_name || "",
        year: Number(
          details.release_date?.slice(0, 4) ||
            details.first_air_date?.slice(0, 4) ||
            0
        ),
        posterUrl: details.poster_path
          ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
          : null,
        genres: JSON.stringify((details.genres || []).map((g: any) => g.id)),
        runtime: details.runtime || null,
        mediaType: isMovie ? "movie" : "tv",
        favorite: newVal,
      });
    } catch {
      setUserTitleState((prev) => ({ ...prev, favorite: !newVal }));
    }
  };

  const toggleMovieWatched = async () => {
    const newVal = !userTitleState.watched;
    setUserTitleState((prev) => ({ ...prev, watched: newVal }));
    if (newVal && !userTitleState.rating) {
      setShowRatingModal(true);
    }
    try {
      await api.patch(`/api/user-title`, {
        tmdbId: Number(tmdbId),
        titlePL: details.title || details.name || "",
        titleOriginal: details.original_title || details.original_name || "",
        year: Number(details.release_date?.slice(0, 4) || 0),
        posterUrl: details.poster_path
          ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
          : null,
        genres: JSON.stringify((details.genres || []).map((g: any) => g.id)),
        runtime: details.runtime || null,
        mediaType: "movie",
        watched: newVal,
      });
    } catch {
      setUserTitleState((prev) => ({ ...prev, watched: !newVal }));
    }
  };

  const isEpisodeWatched = (seasonNum: number, episodeNum: number) =>
    watchedEpisodes.some(
      (e) =>
        e.seasonNumber === seasonNum && e.episodeNumber === episodeNum
    );

  const isSeasonWatched = (season: any) =>
    season.episodes.length > 0 &&
    season.episodes.every((ep: any) =>
      isEpisodeWatched(season.seasonNumber, ep.episodeNumber)
    );

  const toggleEpisode = async (season: any, episode: any) => {
    const nowWatched = !isEpisodeWatched(
      season.seasonNumber,
      episode.episodeNumber
    );
    if (nowWatched) {
      setWatchedEpisodes((prev) => [
        ...prev,
        {
          seasonNumber: season.seasonNumber,
          episodeNumber: episode.episodeNumber,
          durationMinutes: episode.runtime,
        },
      ]);
    } else {
      setWatchedEpisodes((prev) =>
        prev.filter(
          (e) =>
            !(
              e.seasonNumber === season.seasonNumber &&
              e.episodeNumber === episode.episodeNumber
            )
        )
      );
    }
    try {
      await api.post(`/api/user-episode`, {
        tmdbSeriesId: Number(tmdbId),
        seasonNumber: season.seasonNumber,
        episodeNumber: episode.episodeNumber,
        durationMinutes: episode.runtime || null,
        watched: nowWatched,
        seriesTitle: details?.name || details?.title || null,
      });
    } catch {
      if (nowWatched) {
        setWatchedEpisodes((prev) =>
          prev.filter(
            (e) =>
              !(
                e.seasonNumber === season.seasonNumber &&
                e.episodeNumber === episode.episodeNumber
              )
          )
        );
      } else {
        setWatchedEpisodes((prev) => [
          ...prev,
          {
            seasonNumber: season.seasonNumber,
            episodeNumber: episode.episodeNumber,
            durationMinutes: episode.runtime,
          },
        ]);
      }
    }

    if (nowWatched) {
      const totalEpisodes = seasons.reduce(
        (sum, s) => sum + s.episodes.length,
        0
      );
      const newWatchedCount =
        watchedEpisodes.filter(
          (e) =>
            !(
              e.seasonNumber === season.seasonNumber &&
              e.episodeNumber === episode.episodeNumber
            )
        ).length + 1;
      if (
        totalEpisodes > 0 &&
        newWatchedCount >= totalEpisodes &&
        !userTitleState.rating
      ) {
        setShowRatingModal(true);
      }
    }
  };

  const toggleSeason = async (season: any) => {
    const allWatched = isSeasonWatched(season);
    const newWatched = !allWatched;
    if (newWatched) {
      const toAdd = season.episodes
        .filter(
          (ep: any) =>
            !isEpisodeWatched(season.seasonNumber, ep.episodeNumber)
        )
        .map((ep: any) => ({
          seasonNumber: season.seasonNumber,
          episodeNumber: ep.episodeNumber,
          durationMinutes: ep.runtime,
        }));
      setWatchedEpisodes((prev) => [...prev, ...toAdd]);
    } else {
      setWatchedEpisodes((prev) =>
        prev.filter((e) => e.seasonNumber !== season.seasonNumber)
      );
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
            seriesTitle: details?.name || details?.title || null,
          })
        )
      );
    } catch {
      const ut = await api.get(`/api/user-title`, { params: { tmdbId } });
      setWatchedEpisodes(ut.data.episodes || []);
    }

    if (newWatched) {
      const totalEpisodes = seasons.reduce(
        (sum, s) => sum + s.episodes.length,
        0
      );
      const currentWatched = watchedEpisodes.length;
      const addedCount = season.episodes.filter(
        (ep: any) =>
          !isEpisodeWatched(season.seasonNumber, ep.episodeNumber)
      ).length;
      const newWatchedCount = currentWatched + addedCount;
      if (
        totalEpisodes > 0 &&
        newWatchedCount >= totalEpisodes &&
        !userTitleState.rating
      ) {
        setShowRatingModal(true);
      }
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
      const totalMins = watchedEpisodes.reduce(
        (sum, e) => sum + (e.durationMinutes || 0),
        0
      );
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      const timeStr =
        totalMins > 0
          ? h > 0
            ? ` · ${h}h ${m}min`
            : ` · ${m}min`
          : "";
      return `Obejrzano: ${count} ${
        count === 1 ? "odcinek" : count < 5 ? "odcinki" : "odcinków"
      }${timeStr}`;
    }
  };

  const watchedSummary = formatWatchedTime();

  const toggleExpanded = (seasonNum: number) => {
    setExpandedSeasons((prev) =>
      prev.includes(seasonNum)
        ? prev.filter((n) => n !== seasonNum)
        : [...prev, seasonNum]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        <View style={{ position: "relative" }}>
          {details.backdrop_path ? (
            <Image
              source={{
                uri: `https://image.tmdb.org/t/p/w780${details.backdrop_path}`,
              }}
              style={{ width: "100%", height: 300 }}
            />
          ) : details.poster_path ? (
            <Image
              source={{
                uri: `https://image.tmdb.org/t/p/w780${details.poster_path}`,
              }}
              style={{ width: "100%", height: 300 }}
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: 300,
                backgroundColor: DARK_BG,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="film-outline" size={64} color={SUBTLE} />
            </View>
          )}

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 20,
              paddingTop: 120,
              paddingBottom: 14,
              justifyContent: "flex-end",
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontFamily: FONT_BOLD,
                color: WHITE,
                lineHeight: 30,
              }}
            >
              {title}
            </Text>
          </LinearGradient>

          <Pressable
            onPress={() => router.back()}
            style={{
              position: "absolute",
              top: insets.top + 10,
              left: 16,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ color: WHITE, fontSize: 18, fontFamily: FONT_REGULAR }}>
              ←
            </Text>
          </Pressable>

          <Pressable
            onPress={toggleFavorite}
            style={{
              position: "absolute",
              top: insets.top + 10,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name={
                userTitleState.favorite ? "favorite" : "favorite-border"
              }
              size={20}
              color={userTitleState.favorite ? "#ef4444" : WHITE}
            />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 15 }}>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 15,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                alignItems: "center",
                flex: 1,
              }}
            >
              {year && (
                <Text style={{ fontSize: 12, color: MUTED, fontFamily: FONT_REGULAR }}>
                  {year}
                </Text>
              )}
              {runtime && (
                <>
                  <Text style={{ color: ICON_MUTED, fontFamily: FONT_REGULAR }}>·</Text>
                  <Text style={{ fontSize: 12, color: MUTED, fontFamily: FONT_REGULAR }}>
                    {runtime}
                  </Text>
                </>
              )}
              {genres ? (
                <>
                  <Text style={{ color: ICON_MUTED, fontFamily: FONT_REGULAR }}>·</Text>
                  <Text style={{ fontSize: 12, color: MUTED, fontFamily: FONT_REGULAR }}>
                    {genres}
                  </Text>
                </>
              ) : null}
            </View>

            {isMovie ? (
              <TouchableOpacity
                onPress={toggleMovieWatched}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: userTitleState.watched ? "transparent" : ICON_MUTED,
                  backgroundColor: userTitleState.watched
                    ? WATCHED_BG
                    : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {userTitleState.watched && (
                  <MaterialIcons name="check" size={18} color={WATCHED_CHECK} />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setShowEpisodesModal(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="menu" size={24} color={BLACK} />
              </TouchableOpacity>
            )}
          </View>

          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 12,
              padding: 16,
              gap: 5,
              shadowColor: SHADOW,
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 16, fontFamily: FONT_BOLD, color: BLACK }}>
              {isMovie ? "Informacje o filmie" : "Informacje o serialu"}
            </Text>

            {(ratings?.imdbRating ||
              ratings?.rtScore ||
              details.vote_average > 0) && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                {details.vote_average > 0 && (
                  <>
                    <View style={{ alignItems: "center" }}>
                      <Text
                        style={{
                          fontSize: 9,
                          color: SUBTLE,
                          marginBottom: 2,
                          fontFamily: FONT_REGULAR,
                        }}
                      >
                        TMDB
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MaterialIcons name="star" size={14} color={SUBTLE} />
                        <Text
                          style={{
                            fontSize: 13,
                            fontFamily: FONT_BOLD,
                            color: SUBTLE,
                          }}
                        >
                          {details.vote_average.toFixed(1)}
                        </Text>
                      </View>
                    </View>

                    {(ratings?.imdbRating || ratings?.rtScore) && (
                      <Text
                        style={{
                          color: ICON_MUTED,
                          fontSize: 20,
                          fontFamily: FONT_REGULAR,
                        }}
                      >
                        |
                      </Text>
                    )}
                  </>
                )}

                {ratings?.imdbRating && ratings.imdbRating !== "N/A" && (
                  <>
                    <View style={{ alignItems: "center" }}>
                      <Text
                        style={{
                          fontSize: 9,
                          color: SUBTLE,
                          marginBottom: 2,
                          fontFamily: FONT_REGULAR,
                        }}
                      >
                        IMDb
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: FONT_BOLD,
                          color: SUBTLE,
                        }}
                      >
                        {ratings.imdbRating}
                      </Text>
                    </View>

                    {ratings?.rtScore && ratings.rtScore !== "N/A" && (
                      <Text
                        style={{
                          color: ICON_MUTED,
                          fontSize: 20,
                          fontFamily: FONT_REGULAR,
                        }}
                      >
                        |
                      </Text>
                    )}
                  </>
                )}

                {ratings?.rtScore && ratings.rtScore !== "N/A" && (
                  <View style={{ alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 9,
                        color: SUBTLE,
                        marginBottom: 2,
                        fontFamily: FONT_REGULAR,
                      }}
                    >
                      Rotten Tomatoes
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <MaterialIcons
                        name="local-fire-department"
                        size={14}
                        color={SUBTLE}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: FONT_BOLD,
                          color: SUBTLE,
                        }}
                      >
                        {ratings.rtScore}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {details.overview ? (
              <View>
                <Text
                  style={{
                    fontSize: 13,
                    color: MUTED,
                    lineHeight: 22,
                    fontFamily: FONT_REGULAR,
                  }}
                  numberOfLines={showFullOverview ? undefined : 3}
                >
                  {details.overview}
                </Text>
                {details.overview.length > 120 && (
                  <Pressable
                    onPress={() => setShowFullOverview(!showFullOverview)}
                    style={{ alignSelf: "flex-end", marginTop: 6 }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: FONT_SEMI,
                        color: "#333",
                        marginTop: 6,
                      }}
                    >
                      {showFullOverview ? "Zwiń" : "Więcej"}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null}
          </View>

          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 12,
              padding: 16,
              gap: 12,
              shadowColor: SHADOW,
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 16, fontFamily: FONT_BOLD, color: BLACK }}>
              Gdzie obejrzeć
            </Text>

            {availability.length === 0 ? (
              <View style={{ paddingVertical: 10, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: SUBTLE,
                    fontFamily: FONT_REGULAR,
                  }}
                >
                  Brak danych o dostępności w Polsce
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {availability.map((s: any, idx: number) => {
                  const providerCode = s.providerCode;
                  const logo = providerCode
                    ? getProviderLogo(providerCode)
                    : null;
                  const isOwned = activeProviders.includes(providerCode);
                  const canSubscribe = !isOwned && !!providerCode;

                  const typeLabel: Record<string, string> = {
                    subscription: "Abonament",
                    rent: "Wypożycz",
                    buy: "Wykup",
                    free: "Bezpłatnie",
                  };

                  const cheapestPlan = s.cheapestPlan;

                  return (
                    <Pressable
                      key={idx}
                      onPress={() => {
                        if (canSubscribe && providerCode) {
                          router.push(
                            `/subscriptions-select-plan?provider=${providerCode}` as any
                          );
                        }
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: WHITE,
                        borderRadius: 6,
                        padding: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      })}
                    >
                      <View
                        style={{
                          width: 70,
                          height: 70,
                          borderRadius: 10,
                          backgroundColor: WHITE,
                          justifyContent: "center",
                          alignItems: "center",
                          overflow: "hidden",
                        }}
                      >
                        {logo && (
                          <Image
                            source={logo}
                            style={{
                              width: 60,
                              height: 60,
                              resizeMode: "contain",
                            }}
                          />
                        )}
                      </View>

                      <View style={{ flex: 1, gap: 3 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            color: SUBTLE,
                            fontFamily: FONT_REGULAR,
                          }}
                        >
                          {typeLabel[s.type] || s.type}
                        </Text>
                        {s.type === "subscription" && cheapestPlan ? (
                          <>
                            <Text
                              style={{
                                fontSize: 15,
                                fontFamily: FONT_SEMI,
                                color: BLACK,
                              }}
                            >
                              {cheapestPlan.planName}
                            </Text>
                            <Text
                              style={{
                                fontSize: 13,
                                color: MUTED,
                                fontFamily: FONT_REGULAR,
                              }}
                            >
                              {cheapestPlan.pricePLN % 1 === 0
                                ? `${cheapestPlan.pricePLN} zł/mies.`
                                : `${cheapestPlan.pricePLN.toFixed(2)} zł/mies.`}
                            </Text>
                          </>
                        ) : s.type === "rent" || s.type === "buy" ? (
                          <Text
                            style={{
                              fontSize: 15,
                              fontFamily: FONT_SEMI,
                              color: BLACK,
                            }}
                          >
                            {getProviderName(providerCode)}
                          </Text>
                        ) : null}
                      </View>

                      <View>
                        {isOwned ? (
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 999,
                              backgroundColor: WATCHED_BG,
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Ionicons
                              name="checkmark"
                              size={18}
                              color={WATCHED_CHECK}
                            />
                          </View>
                        ) : canSubscribe ? (
                          <View
                            style={{
                              backgroundColor: BLACK,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 20,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: WHITE,
                                fontFamily: FONT_SEMI,
                              }}
                            >
                              Wykup
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

          {details.credits?.cast?.length > 0 && (
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 12,
                padding: 16,
                gap: 12,
                shadowColor: SHADOW,
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 16, fontFamily: FONT_BOLD, color: BLACK }}>
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
                    onPress={() =>
                      router.push({
                        pathname: "/person/[personId]",
                        params: { personId: String(actor.id) },
                      } as any)
                    }
                    style={{ alignItems: "center", width: 72 }}
                  >
                    {actor.profile_path ? (
                      <Image
                        source={{
                          uri: `https://image.tmdb.org/t/p/w185${actor.profile_path}`,
                        }}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 32,
                          marginBottom: 6,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 32,
                          backgroundColor: "#e0e0e0",
                          marginBottom: 6,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="person" size={28} color="#777" />
                      </View>
                    )}

                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: FONT_MEDIUM,
                        color: BLACK,
                        textAlign: "center",
                      }}
                      numberOfLines={2}
                    >
                      {actor.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {details.credits?.crew?.length > 0 &&
            (() => {
              const directors = details.credits.crew.filter(
                (c: any) => c.job === "Director"
              );
              if (directors.length === 0) return null;
              return (
                <View
                  style={{
                    backgroundColor: WHITE,
                    borderRadius: 12,
                    padding: 16,
                    gap: 12,
                    shadowColor: SHADOW,
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text
                    style={{ fontSize: 16, fontFamily: FONT_BOLD, color: BLACK }}
                  >
                    Reżyseria
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 14 }}
                  >
                    {directors.map((director: any) => (
                      <Pressable
                        key={director.id}
                        onPress={() =>
                          router.push({
                            pathname: "/person/[personId]",
                            params: { personId: String(director.id) },
                          } as any)
                        }
                        style={{ alignItems: "center", width: 72 }}
                      >
                        {director.profile_path ? (
                          <Image
                            source={{
                              uri: `https://image.tmdb.org/t/p/w185${director.profile_path}`,
                            }}
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 32,
                              marginBottom: 6,
                            }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 32,
                              backgroundColor: "#e0e0e0",
                              marginBottom: 6,
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Ionicons name="person" size={28} color={MUTED} />
                          </View>
                        )}
                        <Text
                          style={{
                            fontSize: 11,
                            fontFamily: FONT_MEDIUM,
                            color: BLACK,
                            textAlign: "center",
                          }}
                          numberOfLines={2}
                        >
                          {director.name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              );
            })()}
        </View>
      </ScrollView>

      {showRatingModal && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 20,
              padding: 28,
              marginHorizontal: 30,
              width: "85%",
              alignItems: "center",
              gap: 16,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: FONT_BOLD,
                color: BLACK,
                textAlign: "center",
              }}
            >
              Jak oceniasz ten tytuł?
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: SUBTLE,
                textAlign: "center",
                fontFamily: FONT_REGULAR,
              }}
            >
              Twoja ocena pomoże nam polecić Ci lepsze tytuły
            </Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setSelectedRating(star)}>
                  <Ionicons
                    name={star <= selectedRating ? "star" : "star-outline"}
                    size={34}
                    color={star <= selectedRating ? AMBER : ICON_MUTED}
                  />
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
              <Pressable
                onPress={() => setShowRatingModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: LIGHT_BG,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: FONT_BOLD,
                    color: "#333",
                  }}
                >
                  Pomiń
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  selectedRating > 0 && submitRating(selectedRating)
                }
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: selectedRating > 0 ? BLACK : ICON_MUTED,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: FONT_BOLD,
                    color: WHITE,
                  }}
                >
                  Zapisz
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <Modal
        visible={showEpisodesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEpisodesModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: BG }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingTop: insets.top - 15,
              paddingBottom: 16,
              paddingHorizontal: 20,
              backgroundColor: WHITE,
              borderBottomWidth: 1,
              borderBottomColor: DIVIDER,
            }}
          >
            <Pressable
              onPress={() => setShowEpisodesModal(false)}
              style={{ padding: 4 }}
            >
              <Text style={{ fontSize: 24, fontFamily: FONT_REGULAR }}>←</Text>
            </Pressable>
            <Text
              style={{
                fontSize: 24,
                fontFamily: FONT_SEMI,
                color: BLACK,
                marginLeft: 12,
              }}
            >
              Odcinki
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {seasonsLoading ? (
              <ActivityIndicator
                size="large"
                color={BLACK}
                style={{ marginTop: 40 }}
              />
            ) : (
              seasons.map((season) => (
                <View
                  key={season.seasonNumber}
                  style={{
                    backgroundColor: WHITE,
                    borderRadius: 12,
                    overflow: "hidden",
                    shadowColor: SHADOW,
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => toggleExpanded(season.seasonNumber)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      gap: 10,
                    }}
                  >
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleSeason(season);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{
                        width: 25,
                        height: 25,
                        borderRadius: 20,
                        borderWidth: 2,
                        borderColor: isSeasonWatched(season)
                          ? "transparent"
                          : ICON_MUTED,
                        backgroundColor: isSeasonWatched(season)
                          ? WATCHED_BG
                          : "transparent",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {isSeasonWatched(season) && (
                        <MaterialIcons
                          name="check"
                          size={17}
                          color={WATCHED_CHECK}
                        />
                      )}
                    </TouchableOpacity>

                    <Text
                      style={{
                        flex: 1,
                        fontSize: 17,
                        fontFamily: FONT_SEMI,
                        color: BLACK,
                      }}
                    >
                      {season.name || `Sezon ${season.seasonNumber}`}
                    </Text>

                    <Text
                      style={{
                        fontSize: 12,
                        color: SUBTLE,
                        fontFamily: FONT_REGULAR,
                      }}
                    >
                      {
                        season.episodes.filter((ep: any) =>
                          isEpisodeWatched(
                            season.seasonNumber,
                            ep.episodeNumber
                          )
                        ).length
                      }
                      /{season.episodes.length}
                    </Text>

                    <MaterialIcons
                      name={
                        expandedSeasons.includes(season.seasonNumber)
                          ? "expand-less"
                          : "expand-more"
                      }
                      size={22}
                      color={SUBTLE}
                    />
                  </TouchableOpacity>

                  {expandedSeasons.includes(season.seasonNumber) && (
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: DIVIDER,
                      }}
                    >
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
                          <View
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 16,
                              borderWidth: 2,
                              borderColor: isEpisodeWatched(
                                season.seasonNumber,
                                episode.episodeNumber
                              )
                                ? "transparent"
                                : ICON_MUTED,
                              backgroundColor: isEpisodeWatched(
                                season.seasonNumber,
                                episode.episodeNumber
                              )
                                ? WATCHED_BG
                                : "transparent",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            {isEpisodeWatched(
                              season.seasonNumber,
                              episode.episodeNumber
                            ) && (
                              <MaterialIcons
                                name="check"
                                size={12}
                                color={WATCHED_CHECK}
                              />
                            )}
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 13,
                                fontFamily: FONT_SEMI,
                                color: BLACK,
                              }}
                              numberOfLines={1}
                            >
                              {episode.episodeNumber}. {episode.name}
                            </Text>
                            {episode.runtime ? (
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: SUBTLE,
                                  marginTop: 1,
                                  fontFamily: FONT_REGULAR,
                                }}
                              >
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
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}