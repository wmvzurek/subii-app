import { useState, useEffect } from "react";
import {
  View, Text, FlatList, Image, Pressable,
  ActivityIndicator, TextInput
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const FILTER_LABELS: Record<string, string> = {
  favorite: "❤️ Ulubione",
  watched: "✅ Obejrzane",
  in_progress: "▶️ W trakcie",
  completed: "🏁 Ukończone",
};

export default function WatchedList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { type, filter } = useLocalSearchParams<{ type: string; filter: string }>();

  const isMovies = type === "movies";
  const mediaType = isMovies ? "movie" : "tv";

  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get("/api/user-watched");
      const data = res.data;
      const list = isMovies ? data.movies : data.series;

      const filtered = list.filter((item: any) => {
        if (filter === "favorite") return item.favorite;
        if (filter === "watched") return item.watched;
        if (filter === "in_progress") return item.status === "in_progress";
        if (filter === "completed") return item.status === "completed";
        return true;
      });

      setAllItems(filtered);
    } catch {
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = allItems.filter(item =>
    item.titlePL?.toLowerCase().includes(search.toLowerCase())
  );

  const title = FILTER_LABELS[filter] ?? "Lista";

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>

      {/* Header */}
      <View style={{
        backgroundColor: "#fff",
        paddingTop: insets.top + 10,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
        gap: 12,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#000" }}>{title}</Text>
          <View style={{ marginLeft: "auto", backgroundColor: "#f0f0f0", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#666" }}>{filtered.length}</Text>
          </View>
        </View>

        {/* Wyszukiwarka */}
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 10, paddingHorizontal: 12, gap: 8 }}>
          <Ionicons name="search" size={16} color="#999" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Szukaj..."
            style={{ flex: 1, paddingVertical: 10, fontSize: 15, color: "#000" }}
            placeholderTextColor="#bbb"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#bbb" />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 40 }}>{isMovies ? "🎬" : "📺"}</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>Brak tytułów</Text>
          <Text style={{ fontSize: 14, color: "#999" }}>
            {search.length > 0 ? "Brak wyników wyszukiwania" : "Ta lista jest pusta"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.tmdbId)}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({
                pathname: "/titles/[tmdbId]",
                params: { tmdbId: String(item.tmdbId), mediaType }
              } as any)}
              style={{
                flexDirection: "row",
                backgroundColor: "#fff",
                borderRadius: 14,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {/* Plakat */}
              {item.posterUrl ? (
                <Image source={{ uri: item.posterUrl }} style={{ width: 70, height: 105 }} />
              ) : (
                <View style={{ width: 70, height: 105, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontSize: 28 }}>{isMovies ? "🎬" : "📺"}</Text>
                </View>
              )}

              {/* Info */}
              <View style={{ flex: 1, padding: 14, justifyContent: "center", gap: 5 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }} numberOfLines={2}>
                  {item.titlePL}
                </Text>
                {item.year && (
                  <Text style={{ fontSize: 13, color: "#999" }}>{item.year}</Text>
                )}
                {!isMovies && item.totalEpisodes > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ flex: 1, height: 4, backgroundColor: "#f0f0f0", borderRadius: 2 }}>
                      <View style={{
                        width: `${Math.min(100, (item.watchedEpisodes / item.totalEpisodes) * 100)}%`,
                        height: 4,
                        backgroundColor: "#000",
                        borderRadius: 2,
                      }} />
                    </View>
                    <Text style={{ fontSize: 11, color: "#999" }}>
                      {item.watchedEpisodes}/{item.totalEpisodes} odc.
                    </Text>
                  </View>
                )}
                {item.rating && (
                  <Text style={{ fontSize: 12, color: "#f59e0b", fontWeight: "700" }}>
                    ⭐ {item.rating}/10
                  </Text>
                )}
              </View>

              {/* Ikony statusu */}
              <View style={{ justifyContent: "center", paddingRight: 14, gap: 6 }}>
                {item.favorite && <Text style={{ fontSize: 16 }}>❤️</Text>}
                {isMovies && item.watched && <Text style={{ fontSize: 16 }}>✅</Text>}
                {!isMovies && item.status === "completed" && <Text style={{ fontSize: 16 }}>🏁</Text>}
                {!isMovies && item.status === "in_progress" && <Text style={{ fontSize: 16 }}>▶️</Text>}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
