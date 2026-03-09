import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
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

const FILTER_LABELS: Record<string, string> = {
  favorite: "Ulubione",
  watched: "Obejrzane",
  in_progress: "W trakcie",
  completed: "Ukończone",
};

export default function WatchedList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { type, filter } = useLocalSearchParams<{
    type: string;
    filter: string;
  }>();

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
  const SUBTLE = "#999";
  const LIGHT_BG = "#f0f0f0";
  const PLACEHOLDER = "#9a9a9a";
  const SHADOW = "#000";
  const ARROW = "#ccc";

  const FONT_REGULAR = "Inter_400Regular";
  const FONT_SEMI = "Inter_600SemiBold";

  const isMovies = type === "movies";
  const mediaType = isMovies ? "movie" : "tv";

  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await api.get(`/api/user-watched?page=${pageNum}`);
      const data = res.data;
      const list = isMovies ? data.movies : data.series;

      const filtered = list.filter((item: any) => {
        if (filter === "favorite") return item.favorite;
        if (filter === "watched") return item.watched;
        if (filter === "in_progress") return item.status === "in_progress";
        if (filter === "completed") return item.status === "completed";
        return true;
      });

      setAllItems((prev) =>
        append ? [...prev, ...filtered] : filtered
      );
      setHasMore(data.pagination?.hasMore ?? false);
      setPage(pageNum);
    } catch {
      if (!append) setAllItems([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore && search.length === 0) {
      loadData(page + 1, true);
    }
  };

  const filtered = allItems.filter((item) =>
    item.titlePL?.toLowerCase().includes(search.toLowerCase())
  );

  const title = FILTER_LABELS[filter] ?? "Lista";

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
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color={BLACK} />
            </Pressable>
            <Text
              style={{
                fontSize: 20,
                fontFamily: FONT_SEMI,
                color: BLACK,
              }}
            >
              {title}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: LIGHT_BG,
              borderRadius: 12,
              paddingHorizontal: 14,
              gap: 8,
            }}
          >
            <Ionicons name="search" size={18} color={SUBTLE} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Szukaj..."
              placeholderTextColor={PLACEHOLDER}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                fontSize: 14,
                color: BLACK,
                fontFamily: FONT_REGULAR,
              }}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Text
                  style={{
                    fontSize: 14,
                    color: PLACEHOLDER,
                    fontFamily: FONT_REGULAR,
                  }}
                >
                  ✕
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {loading ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color={BLACK} />
          </View>
        ) : filtered.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Ionicons
              name={isMovies ? "film-outline" : "tv-outline"}
              size={36}
              color={SUBTLE}
            />
            <Text
              style={{
                fontSize: 16,
                fontFamily: FONT_SEMI,
                color: BLACK,
              }}
            >
              Brak tytułów
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: FONT_REGULAR,
                color: SUBTLE,
              }}
            >
              {search.length > 0
                ? "Brak wyników wyszukiwania"
                : "Ta lista jest pusta"}
            </Text>
          </View>
        ) : (
          <FlatList
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  color={BLACK}
                  style={{ padding: 20 }}
                />
              ) : null
            }
            data={filtered}
            keyExtractor={(item) => String(item.tmdbId)}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/titles/[tmdbId]",
                    params: {
                      tmdbId: String(item.tmdbId),
                      mediaType,
                    },
                  } as any)
                }
                style={{
                  backgroundColor: WHITE,
                  borderRadius: 12,
                  flexDirection: "row",
                  overflow: "hidden",
                  shadowColor: SHADOW,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.07,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {item.posterUrl ? (
                  <Image
                    source={{ uri: item.posterUrl }}
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
                      name={isMovies ? "film-outline" : "tv-outline"}
                      size={30}
                      color={SUBTLE}
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
                      fontFamily: FONT_SEMI,
                      color: BLACK,
                    }}
                    numberOfLines={2}
                  >
                    {item.titlePL}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {item.year && (
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: FONT_REGULAR,
                          color: SUBTLE,
                        }}
                      >
                        {item.year}
                      </Text>
                    )}

                    {item.rating && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MaterialIcons name="star" size={12} color={SUBTLE} />
                        <Text
                          style={{
                            fontSize: 12,
                            color: SUBTLE,
                            fontFamily: FONT_SEMI,
                          }}
                        >
                          {item.rating}/10
                        </Text>
                      </View>
                    )}
                  </View>

                  {!isMovies && item.totalEpisodes > 0 && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 2,
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          height: 4,
                          backgroundColor: LIGHT_BG,
                          borderRadius: 2,
                        }}
                      >
                        <View
                          style={{
                            width: `${Math.min(
                              100,
                              (item.watchedEpisodes / item.totalEpisodes) * 100
                            )}%`,
                            height: 4,
                            backgroundColor: BLACK,
                            borderRadius: 2,
                          }}
                        />
                      </View>

                      <Text
                        style={{
                          fontSize: 11,
                          color: SUBTLE,
                          fontFamily: FONT_REGULAR,
                        }}
                      >
                        {item.watchedEpisodes}/{item.totalEpisodes} odc.
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={{
                    alignSelf: "center",
                    paddingRight: 12,
                    fontSize: 18,
                    color: ARROW,
                    fontFamily: FONT_REGULAR,
                  }}
                >
                  ›
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}