import { useState, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SearchCategory = "movie" | "tv" | "person";

const CATEGORIES: { key: SearchCategory; label: string }[] = [
  { key: "movie", label: "Filmy" },
  { key: "tv", label: "Seriale" },
  { key: "person", label: "Osoby" },
];

export default function Search() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<SearchCategory>("movie");
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleChange = (text: string) => {
    setQ(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(text, category);
    }, 350);
  };

  const handleSubmit = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    Keyboard.dismiss();
    doSearch(q, category);
  };

  const handleCategoryChange = (cat: SearchCategory) => {
    setCategory(cat);
    setItems([]);
    if (q.trim()) doSearch(q, cat);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <View style={{
        backgroundColor: "#fff",
        paddingTop: insets.top + 10,
        paddingHorizontal: 20,
        paddingBottom: 16,
      }}>
        <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 12 }}>
          Wyszukaj
        </Text>

        {/* Pole wyszukiwania */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#f0f0f0",
          borderRadius: 12,
          paddingHorizontal: 14,
          gap: 8,
        }}>
          <Text style={{ fontSize: 16, color: "#999" }}>🔍</Text>
          <TextInput
            value={q}
            onChangeText={handleChange}
            onSubmitEditing={handleSubmit}
            placeholder="Szukaj filmów i seriali…"
            placeholderTextColor="#aaa"
            returnKeyType="search"
            style={{
              flex: 1,
              paddingVertical: 12,
              fontSize: 15,
              color: "#000",
            }}
          />
          {q.length > 0 && (
            <Pressable onPress={() => { setQ(""); setItems([]); }}>
              <Text style={{ fontSize: 16, color: "#aaa" }}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Tagi kategorii */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              onPress={() => handleCategoryChange(cat.key)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 7,
                borderRadius: 20,
                backgroundColor: category === cat.key ? "#000" : "#f0f0f0",
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: "600",
                color: category === cat.key ? "#fff" : "#666",
              }}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Loader */}
      {loading && (
        <View style={{ paddingTop: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}

      {/* Pusta lista */}
      {!loading && q.length > 0 && items.length === 0 && (
        <View style={{ paddingTop: 60, alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: "#999" }}>
            Brak wyników dla „{q}"
          </Text>
        </View>
      )}

      {/* Wyniki */}
      {!loading && items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (category === "person") return;
                router.push({
                  pathname: "/titles/[tmdbId]",
                  params: { tmdbId: String(item.id) }
                } as any);
              }}
              style={{
                backgroundColor: "#fff",
                borderRadius: 14,
                flexDirection: "row",
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.07,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {/* Zdjęcie / plakat */}
              {(item.poster_path || item.profile_path) ? (
                <Image
                  source={{ uri: `https://image.tmdb.org/t/p/w185${item.poster_path || item.profile_path}` }}
                  style={{ width: 70, height: 100 }}
                />
              ) : (
                <View style={{
                  width: 70, height: 100,
                  backgroundColor: "#f0f0f0",
                  justifyContent: "center",
                  alignItems: "center",
                }}>
                  <Text style={{ fontSize: 28 }}>
                    {category === "person" ? "👤" : "🎬"}
                  </Text>
                </View>
              )}

              {/* Info */}
              <View style={{ flex: 1, padding: 12, justifyContent: "center", gap: 4 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }} numberOfLines={2}>
                  {item.title || item.name}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {(item.release_date || item.first_air_date) && (
                    <Text style={{ fontSize: 12, color: "#999" }}>
                      {new Date(item.release_date || item.first_air_date).getFullYear()}
                    </Text>
                  )}
                  {item.known_for_department && (
                    <Text style={{
                      fontSize: 11, color: "#fff",
                      backgroundColor: "#000",
                      paddingHorizontal: 6, paddingVertical: 2,
                      borderRadius: 4, fontWeight: "600"
                    }}>
                      {item.known_for_department}
                    </Text>
                  )}
                  {item.vote_average > 0 && (
                    <Text style={{ fontSize: 12, color: "#f59e0b", fontWeight: "700" }}>
                      ⭐ {item.vote_average.toFixed(1)}
                    </Text>
                  )}
                </View>
                {item.overview ? (
                  <Text style={{ fontSize: 12, color: "#666", lineHeight: 17 }} numberOfLines={2}>
                    {item.overview}
                  </Text>
                ) : item.known_for ? (
                  <Text style={{ fontSize: 12, color: "#666", lineHeight: 17 }} numberOfLines={2}>
                    Znany z: {item.known_for.slice(0, 2).map((k: any) => k.title || k.name).join(", ")}
                  </Text>
                ) : null}
              </View>

              {category !== "person" && (
                <Text style={{ alignSelf: "center", paddingRight: 12, fontSize: 18, color: "#ccc" }}>›</Text>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}