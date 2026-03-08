import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { api } from "../../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function PersonScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFullBio, setShowFullBio] = useState(false);

  useEffect(() => {
    loadPerson();
  }, [personId]);

  const loadPerson = async () => {
    try {
      const res = await api.get(`/api/person/${personId}`);
      setDetails(res.data);
    } catch {
      // błąd
    } finally {
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
          backgroundColor: "#f5f5f5",
        }}
      >
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#999" }}>Nie znaleziono osoby</Text>
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
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header ze zdjęciem */}
        <View style={{ backgroundColor: "#fff", paddingBottom: 24 }}>
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
                  backgroundColor: "#222",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="person" size={80} color="#999" />
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
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#fff" }}>
                {details.name}
              </Text>

              {details.known_for_department && (
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "400" }}>
                  {details.known_for_department}
                </Text>
              )}
            </LinearGradient>

            {/* Przycisk wstecz */}
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
              <Text style={{ color: "#fff", fontSize: 18 }}>←</Text>
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
                      color: "#666",
                      marginBottom: 2,
                      fontWeight: "400",
                    }}
                  >
                    Data urodzenia
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: "500", color: "#000" }}>
                    {birthDate} {age ? `(${age} lat)` : ""}
                  </Text>
                </View>
              )}

              {deathDate && (
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#666",
                      marginBottom: 2,
                      fontWeight: "400",
                    }}
                  >
                    Data śmierci
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: "500", color: "#000" }}>
                    {deathDate}
                  </Text>
                </View>
              )}

              {details.place_of_birth && (
                <View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#666",
                      marginBottom: 2,
                      fontWeight: "400",
                    }}
                  >
                    Miejsce urodzenia
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: "500", color: "#000" }}>
                    {details.place_of_birth}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          {/* Biografia */}
          {bio ? (
            <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#000",
                  marginBottom: 8,
                }}
              >
                Biografia
              </Text>

              <Text
                style={{ fontSize: 13, color: "#666", lineHeight: 22 }}
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
                    style={{ fontSize: 13, fontWeight: "600", color: "#000" }}
                  >
                    {showFullBio ? "Zwiń" : "Więcej"}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}

          {/* Filmy */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 16,
              paddingBottom:4,
              gap: 12,
              shadowColor: "#000",
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
                    fontWeight: "700",
                    color: "#000",
                    marginBottom: 8,
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
                        backgroundColor: "#fff",
                        borderRadius: 12,
                        overflow: "hidden",
                        shadowColor: "#000",
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
                      <View style={{ paddingTop: 8, paddingBottom: 10, paddingRight: 8, gap: 2 }}>
                        <Text
                          style={{ fontSize: 11, fontWeight: "700", color: "#000" }}
                          numberOfLines={2}
                        >
                          {movie.title}
                        </Text>

                        {movie.release_date && (
                          <Text style={{ fontSize: 10, color: "#999" }}>
                            {new Date(movie.release_date).getFullYear()}
                          </Text>
                        )}

                        {movie.character && (
                          <Text
                            style={{
                              fontSize: 10,
                              color: "#666",
                              fontStyle: "italic",
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

          {/* Seriale */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 16,
              paddingBottom:4,
              gap: 12,
              shadowColor: "#000",
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
                    fontWeight: "700",
                    color: "#000",
                    marginBottom: 10,
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
                        backgroundColor: "#fff",
                        borderRadius: 12,
                        overflow: "hidden",
                        shadowColor: "#000",
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
                      <View style={{ paddingTop: 8, paddingBottom: 10, paddingRight: 8, gap: 2 }}>
                        <Text
                          style={{ fontSize: 11, fontWeight: "700", color: "#000" }}
                          numberOfLines={2}
                        >
                          {show.name}
                        </Text>

                        {show.first_air_date && (
                          <Text style={{ fontSize: 10, color: "#999" }}>
                            {new Date(show.first_air_date).getFullYear()}
                          </Text>
                        )}

                        {show.character && (
                          <Text
                            style={{
                              fontSize: 10,
                              color: "#666",
                              fontStyle: "italic",
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