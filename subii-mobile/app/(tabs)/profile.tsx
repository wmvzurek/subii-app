import { useState, useEffect } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator, ScrollView, RefreshControl, Image } from "react-native";
import { useRouter } from "expo-router";
import { storage } from "../../src/lib/storage";
import { useAuth } from "../../src/contexts/AuthContext";
import { api, authApi } from "../../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Profile() {
  const router = useRouter();
  const { logout, refreshUser } = useAuth(); // ← DODAJ refreshUser
  const [user, setUser] = useState<any>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"movies" | "series">("movies");
  const [movieSubTab, setMovieSubTab] = useState<"completed" | "favorite">("completed");
  const [seriesSubTab, setSeriesSubTab] = useState<"completed" | "in_progress" | "favorite">("completed");
  const [watchedData, setWatchedData] = useState<{
    movies: {
      tmdbId: number;
      titlePL: string;
      posterUrl: string | null;
      year: number | null;
      favorite: boolean;
      watched: boolean;
      rating: number | null;
    }[];
    series: {
      tmdbId: number;
      titlePL: string;
      posterUrl: string | null;
      year: number | null;
      favorite: boolean;
      status: "completed" | "in_progress" | "favorite_only";
      watchedEpisodes: number;
      totalEpisodes: number;
      rating: number | null;
    }[];
  } | null>(null);
  const [watchStats, setWatchStats] = useState<{
    movies: { minutes: number; count: number };
    series: { minutes: number; episodeCount: number };
  } | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadUser();
  }, []);

  const formatTime = (minutes: number): string => {
    if (minutes === 0) return "0 min";
    const days = Math.floor(minutes / (60 * 24));
    const hours = Math.floor((minutes % (60 * 24)) / 60);
    const mins = minutes % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}min`;
    return `${mins}min`;
  };

  const loadUser = async () => {
    try {
      // Odśwież dane w AuthContext
      await refreshUser();
      
      // Pobierz zaktualizowane dane z storage
      const freshUser = await storage.getUser();
      setUser(freshUser);
      try {
        const stats = await api.get("/api/user-stats");
        setWatchStats(stats.data);
        const watched = await api.get("/api/user-watched");
        setWatchedData(watched.data);
      } catch {
        // statystyki opcjonalne
      }
      
      console.log("👤 User loaded from storage:", freshUser);
    } catch (error) {
      console.error("Error loading user:", error);
      const savedUser = await storage.getUser();
      setUser(savedUser);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUser();
    setRefreshing(false);
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    try {
      await api.post("/api/auth/resend-verification");
      Alert.alert(
        "Email wysłany! 📧",
        "Sprawdź swoją skrzynkę pocztową."
      );
    } catch (error: any) {
      Alert.alert("Błąd", "Nie udało się wysłać emaila");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Wylogować się?",
      "Czy na pewno chcesz się wylogować?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Wyloguj",
          style: "destructive",
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ padding: 20, paddingTop: insets.top+10, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 28, fontWeight: '800' }}>Profil</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000"
            title="Odświeżanie..."
          />
        }
      >
        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12 }}>
          <Text style={{ fontSize: 14, color: '#666' }}>Imię i nazwisko</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 4 }}>
            {user?.firstName} {user?.lastName}
          </Text>
        </View>

        <View style={{ 
          backgroundColor: user?.emailVerified ? '#d4edda' : '#fff3cd', 
          padding: 20, 
          borderRadius: 12,
          borderWidth: 1,
          borderColor: user?.emailVerified ? '#28a745' : '#ffc107'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: '#666' }}>Email</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: '700',
                  color: user?.emailVerified ? '#155724' : '#856404',
                  flex: 1
                }}>
                  {user?.email}
                </Text>
                {user?.emailVerified ? (
                  <Text style={{ fontSize: 20, marginLeft: 8 }}>✅</Text>
                ) : (
                  <Text style={{ fontSize: 20, marginLeft: 8 }}>⚠️</Text>
                )}
              </View>
            </View>
          </View>
          {/* Zakładka Obejrzane */}
        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: "#000", marginBottom: 14 }}>
            Obejrzane
          </Text>

          {/* Główne zakładki Filmy / Seriale */}
          <View style={{ flexDirection: "row", backgroundColor: "#f0f0f0", borderRadius: 10, padding: 3, marginBottom: 14 }}>
            {(["movies", "series"] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 8,
                  backgroundColor: activeTab === tab ? "#fff" : "transparent",
                  alignItems: "center",
                  shadowColor: activeTab === tab ? "#000" : "transparent",
                  shadowOpacity: 0.08, shadowRadius: 4, elevation: activeTab === tab ? 2 : 0,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: activeTab === tab ? "#000" : "#999" }}>
                  {tab === "movies" ? "🎬 Filmy" : "📺 Seriale"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Pod-zakładki dla filmów */}
          {activeTab === "movies" && (
            <>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                {(["completed", "favorite"] as const).map((sub) => (
                  <Pressable
                    key={sub}
                    onPress={() => setMovieSubTab(sub)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                      backgroundColor: movieSubTab === sub ? "#000" : "#f0f0f0",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: movieSubTab === sub ? "#fff" : "#666" }}>
                      {sub === "completed" ? "Ukończone" : "Ulubione"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Lista filmów */}
              {watchedData ? (() => {
                const list = watchedData.movies.filter(m =>
                  movieSubTab === "completed" ? m.watched : m.favorite
                );
                if (list.length === 0) return (
                  <Text style={{ color: "#999", fontSize: 14, textAlign: "center", paddingVertical: 20 }}>
                    Brak filmów w tej kategorii
                  </Text>
                );
                return (
                  <View style={{ gap: 10 }}>
                    {list.map(movie => (
                      <Pressable
                        key={movie.tmdbId}
                        onPress={() => router.push({ pathname: "/titles/[tmdbId]", params: { tmdbId: String(movie.tmdbId), mediaType: "movie" } } as any)}
                        style={{ flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
                      >
                        {movie.posterUrl ? (
                          <Image source={{ uri: movie.posterUrl }} style={{ width: 60, height: 90 }} />
                        ) : (
                          <View style={{ width: 60, height: 90, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }}>
                            <Text style={{ fontSize: 24 }}>🎬</Text>
                          </View>
                        )}
                        <View style={{ flex: 1, padding: 12, justifyContent: "center", gap: 4 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: "#000" }} numberOfLines={2}>
                            {movie.titlePL}
                          </Text>
                          <Text style={{ fontSize: 12, color: "#999" }}>{movie.year}</Text>
                          {movie.rating && (
                            <Text style={{ fontSize: 12, color: "#f59e0b", fontWeight: "700" }}>
                              ⭐ {movie.rating}/10
                            </Text>
                          )}
                        </View>
                        {movie.favorite && (
                          <Text style={{ alignSelf: "center", paddingRight: 14, fontSize: 16 }}>❤️</Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                );
              })() : <ActivityIndicator color="#000" />}
            </>
          )}

          {/* Pod-zakładki dla seriali */}
          {activeTab === "series" && (
            <>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {(["completed", "in_progress", "favorite"] as const).map((sub) => (
                  <Pressable
                    key={sub}
                    onPress={() => setSeriesSubTab(sub)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                      backgroundColor: seriesSubTab === sub ? "#000" : "#f0f0f0",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: seriesSubTab === sub ? "#fff" : "#666" }}>
                      {sub === "completed" ? "Ukończone" : sub === "in_progress" ? "W trakcie" : "Ulubione"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Lista seriali */}
              {watchedData ? (() => {
                const list = watchedData.series.filter(s =>
                  seriesSubTab === "favorite" ? s.favorite : s.status === seriesSubTab
                );
                if (list.length === 0) return (
                  <Text style={{ color: "#999", fontSize: 14, textAlign: "center", paddingVertical: 20 }}>
                    Brak seriali w tej kategorii
                  </Text>
                );
                return (
                  <View style={{ gap: 10 }}>
                    {list.map(show => (
                      <Pressable
                        key={show.tmdbId}
                        onPress={() => router.push({ pathname: "/titles/[tmdbId]", params: { tmdbId: String(show.tmdbId), mediaType: "tv" } } as any)}
                        style={{ flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
                      >
                        {show.posterUrl ? (
                          <Image source={{ uri: show.posterUrl }} style={{ width: 60, height: 90 }} />
                        ) : (
                          <View style={{ width: 60, height: 90, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }}>
                            <Text style={{ fontSize: 24 }}>📺</Text>
                          </View>
                        )}
                        <View style={{ flex: 1, padding: 12, justifyContent: "center", gap: 4 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: "#000" }} numberOfLines={2}>
                            {show.titlePL}
                          </Text>
                          <Text style={{ fontSize: 12, color: "#999" }}>{show.year}</Text>
                          {show.totalEpisodes > 0 && (
                            <Text style={{ fontSize: 12, color: "#666" }}>
                              {show.watchedEpisodes}/{show.totalEpisodes} odcinków
                            </Text>
                          )}
                          {show.rating && (
                            <Text style={{ fontSize: 12, color: "#f59e0b", fontWeight: "700" }}>
                              ⭐ {show.rating}/10
                            </Text>
                          )}
                        </View>
                        {show.favorite && (
                          <Text style={{ alignSelf: "center", paddingRight: 14, fontSize: 16 }}>❤️</Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                );
              })() : <ActivityIndicator color="#000" />}
            </>
          )}
        </View>

          {/* Statystyki oglądania */}
        {watchStats && (
          <View style={{
            marginHorizontal: 20,
            marginBottom: 16,
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 20,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 3,
          }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#999", marginBottom: 14, letterSpacing: 0.5 }}>
              CZAS SPĘDZONY NA OGLĄDANIU
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>

              {/* Filmy */}
              <View style={{
                flex: 1,
                backgroundColor: "#f5f5f5",
                borderRadius: 12,
                padding: 14,
                alignItems: "center",
                gap: 4,
              }}>
                <Text style={{ fontSize: 26, fontWeight: "900", color: "#000" }}>
                  {formatTime(watchStats.movies.minutes)}
                </Text>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600" }}>
                  🎬 Filmy
                </Text>
                <Text style={{ fontSize: 11, color: "#bbb" }}>
                  {watchStats.movies.count} {watchStats.movies.count === 1 ? "film" : watchStats.movies.count < 5 ? "filmy" : "filmów"}
                </Text>
              </View>

              {/* Seriale */}
              <View style={{
                flex: 1,
                backgroundColor: "#f5f5f5",
                borderRadius: 12,
                padding: 14,
                alignItems: "center",
                gap: 4,
              }}>
                <Text style={{ fontSize: 26, fontWeight: "900", color: "#000" }}>
                  {formatTime(watchStats.series.minutes)}
                </Text>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600" }}>
                  📺 Seriale
                </Text>
                <Text style={{ fontSize: 11, color: "#bbb" }}>
                  {watchStats.series.episodeCount} {watchStats.series.episodeCount === 1 ? "odcinek" : watchStats.series.episodeCount < 5 ? "odcinki" : "odcinków"}
                </Text>
              </View>

            </View>
          </View>
        )}  
          
          {user?.emailVerified ? (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#c3e6cb' }}>
              <Text style={{ fontSize: 12, color: '#155724', fontWeight: '600' }}>
                ✓ Email zweryfikowany
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ffe69c' }}>
              <Text style={{ fontSize: 12, color: '#856404', marginBottom: 8 }}>
                Email nie został zweryfikowany. Sprawdź swoją skrzynkę pocztową.
              </Text>
              <Pressable
                onPress={handleResendVerification}
                disabled={resendingEmail}
                style={{ 
                  padding: 10, 
                  backgroundColor: '#ffc107', 
                  borderRadius: 8,
                  opacity: resendingEmail ? 0.6 : 1
                }}
              >
                {resendingEmail ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={{ color: '#000', textAlign: 'center', fontWeight: '600', fontSize: 12 }}>
                    📧 Wyślij ponownie email weryfikacyjny
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12 }}>
          <Text style={{ fontSize: 14, color: '#666' }}>Telefon</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 4 }}>
            {user?.phone}
          </Text>
        </View>

        <Pressable
          onPress={handleLogout}
          style={{ padding: 16, backgroundColor: '#fee', borderRadius: 10, borderWidth: 1, borderColor: '#fcc', marginTop: 16 }}
        >
          <Text style={{ color: '#c00', textAlign: 'center', fontWeight: '700' }}>
            🚪 Wyloguj się
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}