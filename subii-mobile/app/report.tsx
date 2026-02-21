// app/report.tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { api } from "../src/lib/api";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Report() {
  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0,7)); // YYYY-MM
  const [data, setData] = useState<any>(null);
  const insets = useSafeAreaInsets();

  const loadReport = async () => {
    const res = await api.get("/api/report", { params: { period } });
    setData(res.data);
  };

  const exportPDF = async () => {
    if (!data) return;
    const html = `
      <html><body>
        <h2>Raport miesięczny (${period})</h2>
        <h3>Koszty</h3>
        <ul>${data.costs.map((c:any)=>`<li>${c.providerCode}: ${c.pricePLN.toFixed(2)} PLN</li>`).join("")}</ul>
        <h3>Oglądane tytuły</h3>
        <ul>${data.watched.map((w:any)=>`<li>${w.title} (${w.minutes} min)</li>`).join("")}</ul>
        <h3>Sugestie oszczędności</h3>
        <ul>${data.suggestions.map((s:string)=>`<li>${s}</li>`).join("")}</ul>
        <hr/><small>Generowane lokalnie dla celów edukacyjnych.</small>
      </body></html>
    `;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:12 }}>
      <Text style={{ fontSize:18, fontWeight:"700" }}>Raport miesięczny</Text>
      <Text>Okres (YYYY-MM):</Text>
      <TextInput
        value={period}
        onChangeText={setPeriod}
        style={{ borderWidth:1, borderColor:"#ccc", borderRadius:8, padding:10 }}
      />
      <Pressable onPress={loadReport} style={{ padding:12, backgroundColor:"#222", borderRadius:8 }}>
        <Text style={{ color:"#fff" }}>Pobierz raport</Text>
      </Pressable>

      {data && (
        <>
          <Text style={{ fontWeight:"700" }}>Koszty:</Text>
          {data.costs.map((c:any, i:number)=><Text key={i}>• {c.providerCode}: {c.pricePLN.toFixed(2)} PLN</Text>)}
          <Text style={{ fontWeight:"700", marginTop:8 }}>Oglądane tytuły:</Text>
          {data.watched.map((w:any, i:number)=><Text key={i}>• {w.title} – {w.minutes} min</Text>)}
          <Text style={{ fontWeight:"700", marginTop:8 }}>Sugestie:</Text>
          {data.suggestions.map((s:string, i:number)=><Text key={i}>• {s}</Text>)}

          <Pressable onPress={exportPDF} style={{ marginTop:12, padding:12, backgroundColor:"#1e90ff", borderRadius:8 }}>
            <Text style={{ color:"#fff" }}>Eksportuj do PDF</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
