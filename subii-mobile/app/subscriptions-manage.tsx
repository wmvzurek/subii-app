// app/subscriptions-manage.tsx
import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { subscriptionsApi } from "../src/lib/api";

export default function SubscriptionsManage() {
  const router = useRouter();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubs();
  }, []);

  const loadSubs = async () => {
    setLoading(true);
    try {
      const res = await subscriptionsApi.getAll();
      setSubs(res.subscriptions || []);
    } catch (error) {
      Alert.alert("Błąd", "Nie udało się pobrać subskrypcji");
    } finally {
      setLoading(false);
    }
  };

  const deleteSub = async (id: number) => {
    Alert.alert(
      "Usuń subskrypcję",
      "Czy na pewno chcesz usunąć tę subskrypcję?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: async () => {
            try {
              await subscriptionsApi.delete(id);
              loadSubs();
              Alert.alert("Sukces", "Subskrypcja usunięta");
            } catch {
              Alert.alert("Błąd", "Nie udało się usunąć");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Pressable
        onPress={() => router.push("/subscriptions-add" as any)}
        style={{ padding: 14, backgroundColor: "#000", borderRadius: 10 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
          ➕ Dodaj subskrypcję
        </Text>
      </Pressable>

      {subs.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 24, color: "#999" }}>
          Nie masz jeszcze żadnych subskrypcji
        </Text>
      ) : (
        <FlatList
          data={subs}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={{
              padding: 14,
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 10,
              marginBottom: 12,
              gap: 6
            }}>
              <Text style={{ fontSize: 18, fontWeight: "700" }}>
                {item.provider.name}
              </Text>
              <Text style={{ color: "#555" }}>
                Plan: {item.plan.planName}
              </Text>
              <Text style={{ color: "#555" }}>
                Cena: {(item.priceOverridePLN || item.plan.pricePLN).toFixed(2)} zł
              </Text>
              <Text style={{ color: "#555" }}>
                Następna płatność: {new Date(item.nextDueDate).toLocaleDateString("pl-PL")}
              </Text>
              
              <Pressable
                onPress={() => deleteSub(item.id)}
                style={{ marginTop: 8, padding: 10, backgroundColor: "#fee", borderRadius: 8 }}
              >
                <Text style={{ color: "#c00", textAlign: "center" }}>🗑 Usuń</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}