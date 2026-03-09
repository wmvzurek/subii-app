import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { api } from "../../src/lib/api";

export default function PersonScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFullBio, setShowFullBio] = useState(false);

  const BG = "#f5f5f5";
  const WHITE = "#fff";
  const BLACK = "#252729";
  const MUTED = "#666";
  const LIGHT_MUTED = "#999";
  const DARK_PLACEHOLDER = "#222";
  const OVERLAY = "rgba(0,0,0,0.5)";
  const OVERLAY_GRADIENT = "rgba(0,0,0,0.8)";

  const FONT_THIN = "Inter_100Thin";
  const FONT_EXTRA_LIGHT = "Inter_200ExtraLight";
  const FONT_LIGHT = "Inter_300Light";
  const FONT_REGULAR = "Inter_400Regular";
  const FONT_MEDIUM = "Inter_500Medium";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";
  const FONT_EXTRA_BOLD = "Inter_800ExtraBold";
  const FONT_BLACK = "Inter_900Black";

  const loadPerson = useCallback(async () => {
    try {
      const res = await api.get(`/api/person/${personId}`);
      setDetails(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    loadPerson();
  }, [loadPerson]);

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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: BG,
        }}
      >
        <Text
          style={{
            color: LIGHT_MUTED,
            fontFamily: FONT_REGULAR,
          }}
        >
          Nie znaleziono osoby
        </Text>
      </View>
    );
  }

  const birthDate = details.birthday
    ? new Date(details.birthday).toLocaleDateString("pl-PL")
    : null;

  const deathDate = details.deathday
    ? new Date(details.deathday).toLocaleDateString("pl-PL")
    : null;

  const age =
    details.birthday && !details.deathday
      ? Math.floor(
          (new Date().getTime() - new Date(details.birthday).getTime()) /
            (1000 * 60 * 60 * 24 * 365)
        )
      : null;

  const movies = (details.movie_credits?.cast || [])
    .filter((m: any) => m.poster_path)
    .sort((a: any, b: any) => b.popularity - a.popularity)
    .slice(0, 20);

  const tvShows = (details.tv_credits?.cast || [])
    .filter((t: any) => t.poster_path)
    .sort((a: any, b: any) => b.popularity - a.popularity)
    .slice(0, 20);

  const bio = details.biography || "";

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ backgroundColor: WHITE, paddingBottom: 24 }}>
          <View style={{ position: "relative" }}>
            {details.profile_path ? (
              <Image
                source={{
                  uri: `https://image.tmdb.org/t/p/w780${details.profile_path}`,
                }}
                style={{ width: "100%", height: 500 }}
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: 300,
                  backgroundColor: DARK_PLACEHOLDER,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="person" size={80} color={LIGHT_MUTED} />
              </View>
            )}

            <LinearGradient
              colors={["transparent", OVERLAY_GRADIENT]}
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
                  color: WHITE,
                  fontFamily: FONT_BOLD,
                }}
              >
                {details.name}
              </Text>

              {details.known_for_department && (
                <Text
                  style={{
                    color: WHITE,
                    fontSize: 12,
                    fontFamily: FONT_REGULAR,
                  }}
                >
                  {details.known_for_department}
                </Text>
              )}
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
                backgroundColor: OVERLAY,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: WHITE,
                  fontSize: 18,
                  fontFamily: FONT_REGULAR,
                }}
              >
                ←
              </Text>
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 8 }}>
            <View
              style={{
                flexDirection: "column",
                gap: 12,
              }}
            >
              {birthDate && (
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: MUTED,
                      marginBottom: 2,
                      fontFamily: FONT_REGULAR,
                    }}
                  >
                    Data urodzenia
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      color: BLACK,
                      fontFamily: FONT_MEDIUM,
                    }}
                  >
                    {birthDate} {age ? `(${age} lat)` : ""}
                  </Text>
                </View>
              )}

              {deathDate && (
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: MUTED,
                      marginBottom: 2,
                      fontFamily: FONT_REGULAR,
                    }}
                  >
                    Data śmierci
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      color: BLACK,
                      fontFamily: FONT_MEDIUM,
                    }}
                  >
                    {deathDate}
                  </Text>
                </View>
              )}

              {details.place_of_birth && (
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: MUTED,
                      marginBottom: 2,
                      fontFamily: FONT_REGULAR,
                    }}
                  >
                    Miejsce urodzenia
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      color: BLACK,
                      fontFamily: FONT_MEDIUM,
                    }}
                  >
                    {details.place_of_birth}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          {bio ? (
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: BLACK,
                  marginBottom: 8,
                  fontFamily: FONT_BOLD,
                }}
              >
                Biografia
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  color: MUTED,
                  lineHeight: 22,
                  fontFamily: FONT_REGULAR,
                }}
                numberOfLines={showFullBio ? undefined : 3}
              >
                {bio}
              </Text>

              {bio.length > 120 && (
                <Pressable
                  onPress={() => setShowFullBio(!showFullBio)}
                  style={{ alignSelf: "flex-end", marginTop: 6 }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: BLACK,
                      fontFamily: FONT_SEMI,
                    }}
                  >
                    {showFullBio ? "Zwiń" : "Więcej"}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}

          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 12,
              padding: 16,
              paddingBottom: 4,
              gap: 12,
              shadowColor: BLACK,
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {movies.length > 0 && (
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    color: BLACK,
                    marginBottom: 8,
                    fontFamily: FONT_BOLD,
                  }}
                >
                  Filmy ({movies.length})
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                >
                  {movies.map((movie: any, idx: number) => (
                    <Pressable
                      key={`movie-${movie.id}-${idx}`}
                      onPress={() =>
                        router.push({
                          pathname: "/titles/[tmdbId]",
                          params: { tmdbId: String(movie.id), mediaType: "movie" },
                        } as any)
                      }
                      style={{
                        width: 110,
                        backgroundColor: WHITE,
                        borderRadius: 12,
                        overflow: "hidden",
                        shadowColor: BLACK,
                        shadowOpacity: 0.07,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Image
                        source={{
                          uri: `https://image.tmdb.org/t/p/w342${movie.poster_path}`,
                        }}
                        style={{ width: 110, height: 160 }}
                      />
                      <View
                        style={{
                          paddingTop: 8,
                          paddingBottom: 10,
                          paddingRight: 8,
                          gap: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: BLACK,
                            fontFamily: FONT_BOLD,
                          }}
                          numberOfLines={2}
                        >
                          {movie.title}
                        </Text>

                        {movie.release_date && (
                          <Text
                            style={{
                              fontSize: 10,
                              color: LIGHT_MUTED,
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            {new Date(movie.release_date).getFullYear()}
                          </Text>
                        )}

                        {movie.character && (
                          <Text
                            style={{
                              fontSize: 10,
                              color: MUTED,
                              fontStyle: "italic",
                              fontFamily: FONT_REGULAR,
                            }}
                            numberOfLines={1}
                          >
                            jako {movie.character}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 12,
              padding: 16,
              paddingBottom: 4,
              gap: 12,
              shadowColor: BLACK,
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {tvShows.length > 0 && (
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    color: BLACK,
                    marginBottom: 10,
                    fontFamily: FONT_BOLD,
                  }}
                >
                  Seriale ({tvShows.length})
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                >
                  {tvShows.map((show: any, idx: number) => (
                    <Pressable
                      key={`tv-${show.id}-${idx}`}
                      onPress={() =>
                        router.push({
                          pathname: "/titles/[tmdbId]",
                          params: { tmdbId: String(show.id), mediaType: "tv" },
                        } as any)
                      }
                      style={{
                        width: 110,
                        backgroundColor: WHITE,
                        borderRadius: 12,
                        overflow: "hidden",
                        shadowColor: BLACK,
                        shadowOpacity: 0.07,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Image
                        source={{
                          uri: `https://image.tmdb.org/t/p/w342${show.poster_path}`,
                        }}
                        style={{ width: 110, height: 160 }}
                      />
                      <View
                        style={{
                          paddingTop: 8,
                          paddingBottom: 10,
                          paddingRight: 8,
                          gap: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: BLACK,
                            fontFamily: FONT_BOLD,
                          }}
                          numberOfLines={2}
                        >
                          {show.name}
                        </Text>

                        {show.first_air_date && (
                          <Text
                            style={{
                              fontSize: 10,
                              color: LIGHT_MUTED,
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            {new Date(show.first_air_date).getFullYear()}
                          </Text>
                        )}

                        {show.character && (
                          <Text
                            style={{
                              fontSize: 10,
                              color: MUTED,
                              fontStyle: "italic",
                              fontFamily: FONT_REGULAR,
                            }}
                            numberOfLines={1}
                          >
                            jako {show.character}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}