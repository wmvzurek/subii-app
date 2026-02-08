// app/titles/[tmdbId].tsx
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, Image, Linking, Pressable, ScrollView } from "react-native";
import { api } from "../../src/lib/api";

export default function TitleScreen() {
  const { tmdbId } = useLocalSearchParams<{ tmdbId: string }>();
  const [details, setDetails] = useState<any>(null);
  const [availability, setAvailability] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const d = await api.get(`/api/title/${tmdbId}`);
      setDetails(d.data);
      // spróbuj po tytule/roku (backend zrobi mapowanie do Watchmode)
      const a = await api.get(`/api/availability`, {
        params: { title: d.data.title, year: d.data.release_date?.slice(0,4) }
      });
      setAvailability(a.data.sources || []);
    })();
  }, [tmdbId]);

  if (!details) return <Text style={{ padding:16 }}>Ładowanie…</Text>;

  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:12 }}>
      {details.poster_path ? (
        <Image
          source={{ uri: `https://image.tmdb.org/t/p/w342${details.poster_path}` }}
          style={{ width:170, height:255, borderRadius:8, alignSelf:"center" }}
        />
      ) : null}
      <Text style={{ fontSize:20, fontWeight:"700", marginTop:8 }}>{details.title}</Text>
      <Text style={{ color:"#555" }}>{details.overview}</Text>

      <Text style={{ marginTop:12, fontWeight:"600" }}>Gdzie obejrzeć (PL):</Text>
      {availability.length === 0 ? (
        <Text>Brak danych o źródłach.</Text>
      ) : availability.map((s, idx) => (
        <Pressable key={idx} onPress={() => s.web_url && Linking.openURL(s.web_url)}>
          <Text>• {s.name} — {s.type}{s.price ? ` (${s.price} PLN)` : ""}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
