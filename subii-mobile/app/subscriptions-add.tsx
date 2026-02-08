// app/subscriptions-add.tsx
import { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { plansApi, subscriptionsApi } from "../src/lib/api";

export default function SubscriptionsAdd() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [nextDueDate, setNextDueDate] = useState("");

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await plansApi.getAll();
      setPlans(res.plans || []);
    } catch {
      Alert.alert("Błąd", "Nie udało się pobrać planów");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
  if (!selectedPlan) {
    Alert.alert("Błąd", "Wybierz plan");
    return;
  }
  if (!nextDueDate) {
    Alert.alert("Błąd", "Podaj datę następnej płatności (YYYY-MM-DD)");
    return;
  }

  try {
    await subscriptionsApi.create({
      planId: selectedPlan.id,
      nextDueDate,
    });
    Alert.alert("Sukces", "Subskrypcja dodana!");
    router.back(); // ← Wraca do poprzedniego ekranu, który się auto-odświeży
  } catch (error: any) {
    Alert.alert("Błąd", error.response?.data?.error || "Nie udało się dodać");
  }
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
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Wybierz plan</Text>

      <FlatList
        data={plans}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedPlan(item)}
            style={{
              padding: 14,
              borderWidth: 2,
              borderColor: selectedPlan?.id === item.id ? "#000" : "#ddd",
              borderRadius: 10,
              marginBottom: 10,
              backgroundColor: selectedPlan?.id === item.id ? "#f0f0f0" : "#fff"
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 16 }}>
              {item.providerCode} — {item.planName}
            </Text>
            <Text style={{ color: "#555", marginTop: 4 }}>
              {item.pricePLN.toFixed(2)} zł / miesiąc
            </Text>
            <Text style={{ color: "#777", fontSize: 12, marginTop: 2 }}>
              {item.screens} ekrany • {item.uhd ? "4K" : "HD"} • {item.ads ? "z reklamami" : "bez reklam"}
            </Text>
          </Pressable>
        )}
      />

      {selectedPlan && (
        <View style={{ gap: 8, marginTop: 12 }}>
          <Text style={{ fontWeight: "600" }}>Data następnej płatności (YYYY-MM-DD):</Text>
          <TextInput
            value={nextDueDate}
            onChangeText={setNextDueDate}
            placeholder="2025-03-15"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 10,
              padding: 14,
              fontSize: 16
            }}
          />

          <Pressable
            onPress={handleAdd}
            style={{
              padding: 16,
              backgroundColor: "#000",
              borderRadius: 10,
              marginTop: 8
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
              ✅ Dodaj subskrypcję
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}