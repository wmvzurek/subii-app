import { useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "../../src/lib/api";

export default function Home() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSubscriptions();
    }, [])
  );

  const loadSubscriptions = async () => {
    try {
      const res = await api.get('/api/subscriptions');
      const active = (res.data.subscriptions || []).filter((s: any) => s.status === 'active');
      setSubscriptions(active);
    } catch (error) {
      console.error('Błąd ładowania subskrypcji:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ padding: 20, paddingTop: 60, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 28, fontWeight: '800' }}>Moje subskrypcje</Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          Aktywne: {subscriptions.length}
        </Text>
      </View>

      {subscriptions.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, color: '#999', textAlign: 'center', marginBottom: 16 }}>
            Nie masz jeszcze żadnych subskrypcji
          </Text>
          <Pressable
            onPress={() => router.push("/subscriptions-add" as any)}
            style={{ padding: 14, backgroundColor: '#000', borderRadius: 10 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              ➕ Dodaj pierwszą subskrypcję
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          numColumns={2}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {/* Szczegóły */}}
              style={{
                flex: 1,
                margin: 8,
                padding: 16,
                backgroundColor: '#fff',
                borderRadius: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                minHeight: 140,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                {item.provider.name}
              </Text>
              <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                {item.plan.planName}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '800', marginTop: 'auto' }}>
                {(item.priceOverridePLN || item.plan.pricePLN).toFixed(2)} zł
              </Text>
              <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                Płatność: {new Date(item.nextDueDate).toLocaleDateString('pl-PL')}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Pressable
        onPress={() => router.push("/subscriptions-add" as any)}
        style={{
          position: 'absolute',
          bottom: 80,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: '#000',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 32, lineHeight: 32 }}>+</Text>
      </Pressable>
    </View>
  );
}