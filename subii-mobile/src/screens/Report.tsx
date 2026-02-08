import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, TextInput, ActivityIndicator, Alert } from 'react-native';
import { BASE_URL } from '../../src/lib/api';

type Cost = { providerCode: string; pricePLN: number };
type Watch = { title: string; minutes: number };

export default function Report() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0,7)); // YYYY-MM
  const [data, setData] = useState<{period:string; costs:Cost[]; watched:Watch[]; suggestions:string[]} | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/report?period=${period}`);
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      setData(j);
    } catch {
      Alert.alert('Błąd', 'Nie udało się pobrać raportu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Text>Raport za okres (YYYY-MM):</Text>
      <TextInput
        value={period}
        onChangeText={setPeriod}
        placeholder="YYYY-MM"
        autoCapitalize="none"
        style={{ borderWidth:1, borderColor:'#ccc', padding:10, borderRadius:10 }}
      />
      <Pressable onPress={load} style={{ padding:12, backgroundColor:'#eee', borderRadius:10 }}>
        <Text>📊 Pobierz raport</Text>
      </Pressable>

      {loading && <ActivityIndicator />}

      {data && (
        <View style={{ gap:8 }}>
          <Text>Okres: {data.period}</Text>

          <Text style={{ fontWeight:'700', marginTop:8 }}>Koszty:</Text>
          <FlatList data={data.costs} keyExtractor={(_,i)=>`c${i}`} renderItem={({item})=>(
            <Text>• {item.providerCode}: {item.pricePLN.toFixed(2)} zł</Text>
          )} />

          <Text style={{ fontWeight:'700', marginTop:8 }}>Obejrzane:</Text>
          <FlatList data={data.watched} keyExtractor={(_,i)=>`w${i}`} renderItem={({item})=>(
            <Text>• {item.title} — {item.minutes} min</Text>
          )} />

          {!!data.suggestions?.length && (
            <>
              <Text style={{ fontWeight:'700', marginTop:8 }}>Sugestie:</Text>
              {data.suggestions.map((s, i)=><Text key={i}>• {s}</Text>)}
            </>
          )}
        </View>
      )}
    </View>
  );
}
