// app/search.tsx
import { useState } from "react";
import { View, TextInput, Pressable, Text, FlatList, Image } from "react-native";
import { api } from "../../src/lib/api";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Search() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const onSearch = async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await api.get("/api/search", { params: { q } });
      setItems(res.data.results || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex:1, padding:16,paddingTop: insets.top+10}}>
      <View style={{ flexDirection:"row", gap:8 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Szukaj filmu/serialu…"
          style={{ flex:1, borderWidth:1, borderColor:"#ccc", borderRadius:8, padding:10 }}
        />
        <Pressable onPress={onSearch} style={{ padding:12, backgroundColor:"#222", borderRadius:8 }}>
          <Text style={{ color:"#fff" }}>{loading ? "..." : "Szukaj"}</Text>
        </Pressable>
      </View>

      <FlatList
        style={{ marginTop:14 }}
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={({ item }) => (
          <Link href={`/titles/${item.id}`} asChild>
            <Pressable style={{ flexDirection:"row", gap:12, paddingVertical:10 }}>
              {item.poster_path ? (
                <Image
                  source={{ uri: `https://image.tmdb.org/t/p/w185${item.poster_path}` }}
                  style={{ width:60, height:90, borderRadius:6 }}
                />
              ) : null}
              <View style={{ flex:1 }}>
                <Text style={{ fontWeight:"600" }}>{item.title || item.name}</Text>
                <Text numberOfLines={2} style={{ color:"#555" }}>{item.overview}</Text>
              </View>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}
