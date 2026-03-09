import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import { api } from "../../src/lib/api";

type SearchCategory = "movie" | "tv" | "person";

type DiscoveryItem = {
  id: number;
  title: string;
  posterUrl: string | null;
  year: string | null;
  mediaType: string;
  rating: number;
};

const CATEGORIES: { key: SearchCategory; label: string }[] = [
  { key: "movie", label: "Filmy" },
  { key: "tv", label: "Seriale" },
  { key: "person", label: "Osoby" },
];

export default function Search() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [q, setQ] = useState("");
  const [recommended, setRecommended] = useState<DiscoveryItem[]>([]);
  const [newTitles, setNewTitles] = useState<DiscoveryItem[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<SearchCategory>("movie");
  const [isFocused, setIsFocused] = useState(false);

  const BG = "#f5f5f5";
  const WHITE = "#fff";
  const BLACK = "#252729";
  const MUTED = "#666";
  const LIGHT_MUTED = "#999";
  const LIGHTER_MUTED = "#9a9a9a";
  const INPUT_BG = "#f0f0f0";
  const PLACEHOLDER_BG = "#e0e0e0";
  const CHEVRON = "#ccc";

  const FONT_THIN = "Inter_100Thin";
  const FONT_EXTRA_LIGHT = "Inter_200ExtraLight";
  const FONT_LIGHT = "Inter_300Light";
  const FONT_REGULAR = "Inter_400Regular";
  const FONT_MEDIUM = "Inter_500Medium";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";
  const FONT_EXTRA_BOLD = "Inter_800ExtraBold";
  const FONT_BLACK = "Inter_900Black";

  const loadDiscovery = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, newRes] = await Promise.all([
        api.get("/api/recommendations"),
        api.get("/api/new-titles"),
      ]);

      console.log("recommendations:", JSON.stringify(recRes.data));
      console.log("newTitles:", JSON.stringify(newRes.data));

      setRecommended(recRes.data.recommended || []);
      setNewTitles(newRes.data.newTitles || []);
    } catch (e) {
      console.error("[loadDiscovery] błąd:", e);
      setRecommended([]);
      setNewTitles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const doSearch = useCallback(async (query: string, cat: SearchCategory) => {
    if (!query.trim()) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get("/api/search", { params: { q: query } });
      const filtered = (res.data.results || []).filter(
        (item: any) => item.media_type === cat
      );
      setItems(filtered);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      setQ(text);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        doSearch(text, category);
      }, 350);
    },
    [category, doSearch]
  );

  const handleSubmit = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    Keyboard.dismiss();
    doSearch(q, category);
  }, [q, category, doSearch]);

  const handleCategoryChange = useCallback(
    (cat: SearchCategory) => {
      setCategory(cat);
      setItems([]);
      if (q.trim()) doSearch(q, cat);
    },
    [q, doSearch]
  );

  useEffect(() => {
    loadDiscovery();
  }, [loadDiscovery]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={{ flex: 1, backgroundColor: BG }}>
        <View
          style={{
            backgroundColor: WHITE,
            paddingTop: insets.top + 10,
            paddingHorizontal: 20,
            paddingBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              color: BLACK,
              marginBottom: 12,
              fontFamily: FONT_SEMI,
            }}
          >
            Wyszukaj
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: INPUT_BG,
              borderRadius: 12,
              paddingHorizontal: 14,
              gap: 8,
            }}
          >
            <Ionicons name="search" size={18} color={LIGHT_MUTED} />

            <TextInput
              value={q}
              onChangeText={handleChange}
              onSubmitEditing={handleSubmit}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Szukaj filmów i seriali…"
              placeholderTextColor={LIGHTER_MUTED}
              returnKeyType="search"
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                fontSize: 14,
                color: BLACK,
                fontFamily: FONT_REGULAR,
              }}
            />

            {q.length > 0 && (
              <Pressable
                onPress={() => {
                  setQ("");
                  setItems([]);
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: LIGHTER_MUTED,
                    fontFamily: FONT_REGULAR,
                  }}
                >
                  ×
                </Text>
              </Pressable>
            )}
          </View>

          {(isFocused || q.length > 0) && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.key}
                  onPress={() => handleCategoryChange(cat.key)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: category === cat.key ? BLACK : INPUT_BG,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: category === cat.key ? WHITE : LIGHTER_MUTED,
                      fontFamily: FONT_MEDIUM,
                    }}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {q.length === 0 && !isFocused && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
          >
            {recommended.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: BLACK,
                    paddingHorizontal: 16,
                    marginBottom: 12,
                    fontFamily: FONT_SEMI,
                  }}
                >
                  Rekomendowane dla Ciebie
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                >
                  {recommended.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() =>
                        router.push({
                          pathname: "/titles/[tmdbId]",
                          params: {
                            tmdbId: String(item.id),
                            mediaType: item.mediaType === "tv" ? "tv" : "movie",
                          },
                        } as any)
                      }
                      style={{ width: 138 }}
                    >
                      {item.posterUrl ? (
                        <Image
                          source={{ uri: item.posterUrl }}
                          style={{
                            width: 138,
                            height: 200,
                            borderRadius: 10,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 138,
                            height: 200,
                            borderRadius: 10,
                            backgroundColor: PLACEHOLDER_BG,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons
                            name={item.mediaType === "movie" ? "film-outline" : "tv-outline"}
                            size={36}
                            color={LIGHT_MUTED}
                          />
                        </View>
                      )}

                      <Text
                        style={{
                          fontSize: 11,
                          color: BLACK,
                          marginTop: 6,
                          minHeight: 30,
                          fontFamily: FONT_BOLD,
                        }}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>

                      <View
                        style={{
                          width: 130,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: 2,
                        }}
                      >
                        {item.year ? (
                          <Text
                            style={{
                              fontSize: 11,
                              color: LIGHT_MUTED,
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            {item.year}
                          </Text>
                        ) : (
                          <View />
                        )}

                        {item.rating > 0 && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <MaterialIcons name="star" size={12} color={LIGHT_MUTED} />
                            <Text
                              style={{
                                fontSize: 10,
                                color: LIGHT_MUTED,
                                fontFamily: FONT_SEMI,
                              }}
                            >
                              {item.rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {newTitles.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: BLACK,
                    paddingHorizontal: 16,
                    marginBottom: 12,
                    fontFamily: FONT_SEMI,
                  }}
                >
                  Nowości
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                >
                  {newTitles.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() =>
                        router.push({
                          pathname: "/titles/[tmdbId]",
                          params: {
                            tmdbId: String(item.id),
                            mediaType: item.mediaType === "tv" ? "tv" : "movie",
                          },
                        } as any)
                      }
                      style={{ width: 138 }}
                    >
                      {item.posterUrl ? (
                        <Image
                          source={{ uri: item.posterUrl }}
                          style={{
                            width: 138,
                            height: 200,
                            borderRadius: 10,
                          }}
                        />
                      ) : (
                        <View
                          style={{
                            width: 138,
                            height: 200,
                            borderRadius: 10,
                            backgroundColor: PLACEHOLDER_BG,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons
                            name={item.mediaType === "movie" ? "film-outline" : "tv-outline"}
                            size={36}
                            color={LIGHT_MUTED}
                          />
                        </View>
                      )}

                      <Text
                        style={{
                          fontSize: 11,
                          color: BLACK,
                          marginTop: 6,
                          minHeight: 30,
                          fontFamily: FONT_BOLD,
                        }}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>

                      <View
                        style={{
                          width: 130,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: 2,
                        }}
                      >
                        {item.year ? (
                          <Text
                            style={{
                              fontSize: 11,
                              color: LIGHT_MUTED,
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            {item.year}
                          </Text>
                        ) : (
                          <View />
                        )}

                        {item.rating > 0 && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <MaterialIcons name="star" size={12} color={LIGHT_MUTED} />
                            <Text
                              style={{
                                fontSize: 10,
                                color: LIGHT_MUTED,
                                fontFamily: FONT_SEMI,
                              }}
                            >
                              {item.rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {recommended.length === 0 && newTitles.length === 0 && (
              <View style={{ paddingTop: 60, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: LIGHT_MUTED,
                    textAlign: "center",
                    paddingHorizontal: 40,
                    fontFamily: FONT_REGULAR,
                  }}
                >
                  Oceń kilka tytułów żeby zobaczyć rekomendacje
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {loading && (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={BLACK} />
          </View>
        )}

        {!loading && q.length > 0 && items.length === 0 && (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 16,
                color: LIGHT_MUTED,
                fontFamily: FONT_REGULAR,
              }}
            >
              Brak wyników dla „{q}"
            </Text>
          </View>
        )}

        {!loading && items.length > 0 && (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, gap: 10, borderRadius: 12 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  if (category === "person") {
                    router.push({
                      pathname: "/person/[personId]",
                      params: { personId: String(item.id) },
                    } as any);
                    return;
                  }

                  router.push({
                    pathname: "/titles/[tmdbId]",
                    params: { tmdbId: String(item.id), mediaType: item.media_type },
                  } as any);
                }}
                style={{
                  backgroundColor: WHITE,
                  borderRadius: 12,
                  flexDirection: "row",
                  overflow: "hidden",
                  shadowColor: BLACK,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.07,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {item.poster_path || item.profile_path ? (
                  <Image
                    source={{
                      uri: `https://image.tmdb.org/t/p/w185${item.poster_path || item.profile_path}`,
                    }}
                    style={{ width: 70, height: 100 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 70,
                      height: 100,
                      backgroundColor: WHITE,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={category === "person" ? "person" : "film-outline"}
                      size={30}
                      color={LIGHT_MUTED}
                    />
                  </View>
                )}

                <View
                  style={{
                    flex: 1,
                    padding: 12,
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      color: BLACK,
                      fontFamily: FONT_SEMI,
                    }}
                    numberOfLines={2}
                  >
                    {item.title || item.name}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {(item.release_date || item.first_air_date) && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: LIGHT_MUTED,
                          fontFamily: FONT_REGULAR,
                        }}
                      >
                        {new Date(item.release_date || item.first_air_date).getFullYear()}
                      </Text>
                    )}

                    {item.known_for_department && (
                      <Text
                        style={{
                          fontSize: 11,
                          color: LIGHT_MUTED,
                          fontFamily: FONT_SEMI,
                        }}
                      >
                        {item.known_for_department}
                      </Text>
                    )}

                    {item.vote_average > 0 && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <MaterialIcons name="star" size={12} color={LIGHT_MUTED} />
                        <Text
                          style={{
                            fontSize: 12,
                            color: LIGHT_MUTED,
                            fontFamily: FONT_SEMI,
                          }}
                        >
                          {item.vote_average.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {item.overview ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: MUTED,
                        lineHeight: 17,
                        fontFamily: FONT_REGULAR,
                      }}
                      numberOfLines={2}
                    >
                      {item.overview}
                    </Text>
                  ) : item.known_for ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: MUTED,
                        lineHeight: 17,
                        fontFamily: FONT_REGULAR,
                      }}
                      numberOfLines={2}
                    >
                      Znany z: {item.known_for.slice(0, 2).map((k: any) => k.title || k.name).join(", ")}
                    </Text>
                  ) : null}
                </View>

                {category !== "person" && (
                  <Text
                    style={{
                      alignSelf: "center",
                      paddingRight: 12,
                      fontSize: 18,
                      color: CHEVRON,
                      fontFamily: FONT_REGULAR,
                    }}
                  >
                    ›
                  </Text>
                )}
              </Pressable>
            )}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}