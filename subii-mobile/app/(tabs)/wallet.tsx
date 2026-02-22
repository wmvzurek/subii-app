import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../src/lib/api";
import { storage } from "../../src/lib/storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Payments() {
  const router = useRouter();
  const [preview, setPreview] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await storage.getToken();
      if (!token) {
        router.replace("/login" as any);
        return;
      }

      const savedUser = await storage.getUser();
      setUser(savedUser);

      const [previewRes, historyRes] = await Promise.all([
        api.get("/api/billing/preview").catch(() => null),
        api.get("/api/billing/history").catch(() => null),
      ]);

      if (previewRes) setPreview(previewRes.data);
      if (historyRes) setHistory(historyRes.data.history || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        await storage.clearAuth();
        router.replace("/login" as any);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const getNextBillingDate = () => {
    if (!user?.billingDay) return "—";
    const today = new Date();
    const candidate = new Date(today.getFullYear(), today.getMonth(), user.billingDay);
    if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
    return candidate.toLocaleDateString("pl-PL");
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f5f5f5" }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />
      }
    >
      {/* Header */}
      <View style={{ padding: 20, paddingTop: insets.top + 10, backgroundColor: "#fff" }}>
        <Text style={{ fontSize: 28, fontWeight: "800" }}>Płatności</Text>
      </View>

      <View style={{ padding: 16, gap: 16 }}>

        {/* Dzień rozliczeniowy */}
        {user?.billingDay ? (
          <View style={{ padding: 20, backgroundColor: "#000", borderRadius: 16 }}>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
              Dzień rozliczeniowy
            </Text>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 4 }}>
              {user.billingDay}. każdego miesiąca
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>
              Najbliższa płatność: {getNextBillingDate()}
            </Text>
          </View>
        ) : (
          <View style={{
            padding: 16, backgroundColor: "#fff3cd", borderRadius: 16,
            borderWidth: 1, borderColor: "#ffc107"
          }}>
            <Text style={{ fontSize: 14, color: "#856404", fontWeight: "600" }}>
              ⚠️ Nie masz ustawionego dnia rozliczeniowego
            </Text>
            <Text style={{ fontSize: 12, color: "#856404", marginTop: 4 }}>
              Zostanie ustawiony przy dodaniu pierwszej subskrypcji.
            </Text>
          </View>
        )}

        {/* Najbliższa płatność */}
        {preview && preview.items?.length > 0 ? (
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "800" }}>
              Najbliższa płatność
            </Text>
            <Text style={{ fontSize: 13, color: "#666" }}>
              {getNextBillingDate()}
            </Text>

            {preview.items.map((item: any, idx: number) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 8,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: "#f0f0f0",
                }}
              >
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "600" }}>
                    {item.providerName}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    {item.planName}
                    {item.pendingCharge > 0 && (
                      <Text style={{ color: "#f59e0b" }}>
                        {" "}+ dopłata {item.pendingCharge.toFixed(2)} zł
                      </Text>
                    )}
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: "700" }}>
                  {item.toPay.toFixed(2)} zł
                </Text>
              </View>
            ))}

            {/* Suma */}
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: "#000",
            }}>
              <Text style={{ fontSize: 16, fontWeight: "800" }}>Razem</Text>
              <Text style={{ fontSize: 16, fontWeight: "800" }}>
                {preview.totalToPay.toFixed(2)} zł
              </Text>
            </View>
          </View>
        ) : (
          <View style={{
            backgroundColor: "#fff", borderRadius: 16, padding: 20,
            alignItems: "center"
          }}>
            <Text style={{ fontSize: 14, color: "#999" }}>
              Brak zaplanowanych płatności
            </Text>
          </View>
        )}

        {/* Historia płatności */}
        {history.length > 0 && (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", paddingHorizontal: 2 }}>
              Historia płatności
            </Text>

            {history.map((cycle: any) => (
              <View
                key={cycle.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 16,
                  gap: 10,
                }}
              >
                {/* Nagłówek */}
                <View style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <Text style={{ fontSize: 14, fontWeight: "700" }}>
                    {new Date(cycle.billingDate).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                  <View style={{
                    paddingHorizontal: 8, paddingVertical: 4,
                    backgroundColor: cycle.status === "paid"
                      ? "rgba(134,239,172,0.2)"
                      : "rgba(239,68,68,0.12)",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: cycle.status === "paid"
                      ? "rgba(134,239,172,0.4)"
                      : "rgba(239,68,68,0.4)",
                  }}>
                    <Text style={{
                      fontSize: 11, fontWeight: "700",
                      color: cycle.status === "paid" ? "#16a34a" : "#dc2626",
                    }}>
                      {cycle.status === "paid" ? "OPŁACONE" : "OCZEKUJE"}
                    </Text>
                  </View>
                </View>

                {/* Pozycje */}
                {cycle.items.map((item: any, idx: number) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: "#666" }}>
                      {item.providerCode}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: "600" }}>
                      {item.pricePLN.toFixed(2)} zł
                    </Text>
                  </View>
                ))}

                {/* Suma */}
                <View style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: "#f0f0f0",
                }}>
                  <Text style={{ fontSize: 14, fontWeight: "700" }}>Razem</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700" }}>
                    {cycle.totalPLN.toFixed(2)} zł
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </View>
    </ScrollView>
  );
}