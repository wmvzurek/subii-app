import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "../src/lib/api";
import { storage } from "../src/lib/storage";

const SUGGESTED_DAYS = [1, 5, 10, 15, 20, 25, 28];

export default function BillingSetup() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
  if (!selectedDay) {
    Alert.alert("Wybierz dzień", "Zaznacz dzień rozliczeniowy");
    return;
  }

  setLoading(true);
  try {
    await api.post("/api/billing/setup", { billingDay: selectedDay });

    const user = await storage.getUser();
    if (user) {
      await storage.setUser({ ...user, billingDay: selectedDay });
    }

    // Wróć do ekranu wyboru planu – tam modal opcji płatności otworzy się automatycznie
    router.back();
  } catch {
    Alert.alert("Błąd", "Nie udało się zapisać dnia rozliczeniowego");
  } finally {
    setLoading(false);
  }
};

  return (
    <ScrollView
      contentContainerStyle={{ padding: 24, paddingTop: 60, backgroundColor: "#fff", flexGrow: 1 }}
    >
      <Pressable onPress={() => router.back()} style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 28 }}>←</Text>
      </Pressable>

      <Text style={{ fontSize: 28, fontWeight: "900", marginBottom: 8 }}>
        Wybierz dzień rozliczeniowy
      </Text>
      <Text style={{ fontSize: 15, color: "#666", lineHeight: 24, marginBottom: 32 }}>
        Tego dnia każdego miesiąca zostanie pobrana jedna zbiorcza płatność za wszystkie Twoje subskrypcje streamingowe.
      </Text>

      <Text style={{ fontSize: 13, color: "#999", fontWeight: "600", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
        Wybierz dzień
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
        {SUGGESTED_DAYS.map((day) => (
          <Pressable
            key={day}
            onPress={() => setSelectedDay(day)}
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: selectedDay === day ? "#000" : "#ddd",
              backgroundColor: selectedDay === day ? "#000" : "#fff",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{
              fontSize: 22,
              fontWeight: "800",
              color: selectedDay === day ? "#fff" : "#000",
            }}>
              {day}
            </Text>
          </Pressable>
        ))}
      </View>

      {selectedDay && (
        <View style={{
          padding: 16,
          backgroundColor: "#f0f9ff",
          borderRadius: 12,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: "#bae6fd",
        }}>
          <Text style={{ fontSize: 14, color: "#0369a1", lineHeight: 22 }}>
            💡 <Text style={{ fontWeight: "700" }}>{selectedDay}. każdego miesiąca</Text> zostanie pobrana jedna płatność za wszystkie aktywne platformy, których odnowienie wypada w tym okresie.
          </Text>
        </View>
      )}

      <View style={{
        padding: 16,
        backgroundColor: "#fffbeb",
        borderRadius: 12,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: "#fde68a",
      }}>
        <Text style={{ fontSize: 13, color: "#92400e", lineHeight: 20 }}>
          💡 <Text style={{ fontWeight: "700" }}>Wskazówka:</Text> Wybierz dzień po wypłacie – np. jeśli dostajesz wynagrodzenie 10., ustaw rozliczenie na 11. lub 12.
        </Text>
      </View>

      <Pressable
        onPress={handleConfirm}
        disabled={!selectedDay || loading}
        style={{
          padding: 18,
          backgroundColor: selectedDay ? "#000" : "#ccc",
          borderRadius: 14,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 16 }}>
            Zatwierdź dzień rozliczeniowy
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}