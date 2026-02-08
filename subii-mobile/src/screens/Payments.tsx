import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { BASE_URL } from '../../src/lib/api';

type Plan = { providerCode: string; planName: string; pricePLN: number };
type PaymentItem = { providerCode: string; planName: string; pricePLN: number };
type Receipt = { id: string; period: string; amountPLN: number; items: PaymentItem[]; createdAt: string };

export default function Payments() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  async function loadPlans() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/plans`);
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      setPlans(Array.isArray(j.plans) ? j.plans : []);
    } catch {
      Alert.alert('Błąd', 'Nie udało się pobrać planów. Sprawdź BASE_URL i backend.');
    } finally {
      setLoading(false);
    }
  }

  async function payAll() {
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/payments`, { method: 'POST' });
      if (!r.ok) throw new Error(String(r.status));
      const j: Receipt = await r.json();
      setReceipt(j);
    } catch {
      Alert.alert('Błąd', 'Nie udało się wykonać symulacji płatności.');
    } finally {
      setLoading(false);
    }
  }

  const total = plans.reduce((s, p) => s + p.pricePLN, 0);

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Pressable onPress={loadPlans} style={{ padding:14, backgroundColor:'#eee', borderRadius:10 }}>
        <Text>🔄 Załaduj plany</Text>
      </Pressable>

      {loading && <ActivityIndicator />}

      <FlatList
        data={plans}
        keyExtractor={(i) => `${i.providerCode}-${i.planName}`}
        renderItem={({ item }) => (
          <View style={{ paddingVertical:8, borderBottomWidth:1, borderColor:'#ddd' }}>
            <Text style={{ fontWeight:'600' }}>{item.providerCode} — {item.planName}</Text>
            <Text>{item.pricePLN.toFixed(2)} zł / m-c</Text>
          </View>
        )}
        ListFooterComponent={plans.length ? (
          <Text style={{ marginTop:8, fontWeight:'700' }}>Suma: {total.toFixed(2)} zł</Text>
        ) : null}
      />

      <Pressable
        onPress={payAll}
        disabled={!plans.length || loading}
        style={{ padding:14, backgroundColor:'#111', borderRadius:10, opacity: (!plans.length||loading)?0.6:1 }}
      >
        <Text style={{ color:'#fff', textAlign:'center' }}>
          {loading ? 'Przetwarzanie…' : '💳 Opłać wszystkie'}
        </Text>
      </Pressable>

      {receipt && (
        <View style={{ padding:12, backgroundColor:'#f6f6f6', borderRadius:10 }}>
          <Text style={{ fontWeight:'700' }}>✅ Potwierdzenie (symulacja)</Text>
          <Text>Okres: {receipt.period}</Text>
          <Text>Suma: {Number(receipt.amountPLN).toFixed(2)} zł</Text>
        </View>
      )}
    </View>
  );
}
