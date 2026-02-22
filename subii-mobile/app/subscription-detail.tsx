import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, Image, ActivityIndicator,
  Alert, FlatList, Modal
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { api, subscriptionsApi } from "../src/lib/api";
import { getProviderLogo } from "../src/lib/provider-logos";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function getNextRenewalDate(createdAt: string, renewalDay: number, cycle: string = "monthly"): Date {
  const created = new Date(createdAt);
  const today = new Date();
  if (cycle === "yearly") {
    const next = new Date(created);
    while (next <= today) next.setFullYear(next.getFullYear() + 1);
    return next;
  }
  let candidate = new Date(today.getFullYear(), today.getMonth(), renewalDay);
  if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
  return candidate;
}

function getNextBillingDateFromDay(billingDay?: number): string {
  if (!billingDay) return "—";
  const today = new Date();
  const candidate = new Date(today.getFullYear(), today.getMonth(), billingDay);
  if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
  return candidate.toLocaleDateString("pl-PL");
}

function getProviderName(code: string): string {
  const names: Record<string, string> = {
    netflix: "Netflix", disney_plus: "Disney+",
    prime_video: "Prime Video", hbo_max: "Max", apple_tv: "Apple TV+",
  };
  return names[code] || code;
}

export default function SubscriptionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
  const [movies, setMovies] = useState<any[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const { storage } = await import("../src/lib/storage");
      const savedUser = await storage.getUser();
      setUser(savedUser);

      const res = await api.get("/api/subscriptions");
      const all = res.data.subscriptions || [];
      const found = all.find((s: any) => String(s.id) === String(id));

      if (!found) {
        Alert.alert("Błąd", "Nie znaleziono subskrypcji");
        router.back();
        return;
      }

      setSubscription(found);
      loadMovies(found.providerCode);
    } catch {
      Alert.alert("Błąd", "Nie udało się pobrać danych");
    } finally {
      setLoading(false);
    }
  };

  const loadMovies = async (providerCode: string) => {
    setMoviesLoading(true);
    try {
      const res = await api.get(`/api/provider-titles?provider=${providerCode}`);
      setMovies(res.data.titles || []);
    } catch {
      setMovies([]);
    } finally {
      setMoviesLoading(false);
    }
  };

  const handleReactivateConfirm = async () => {
    setShowReactivateConfirm(false);
    try {
      await subscriptionsApi.update(subscription.id, {
        status: "active",
        activeUntil: null,
        cancelledAt: null,
      });
      Alert.alert("Reaktywowano! ✅", "Subskrypcja jest ponownie aktywna.", [
        { text: "OK", onPress: () => loadData() }
      ]);
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się reaktywować");
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;
    setShowCancelConfirm(false);
    try {
      const res = await subscriptionsApi.delete(subscription.id);
      const until = res.activeUntil
        ? new Date(res.activeUntil).toLocaleDateString("pl-PL")
        : "—";
      Alert.alert(
        "Rezygnacja przyjęta",
        `Dostęp do ${getProviderName(subscription.providerCode)} masz do ${until}.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się zrezygnować");
    }
  };

  const handleOpenChangePlan = () => {
    router.push(`/subscriptions-select-plan?provider=${subscription.providerCode}` as any);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!subscription) return null;

  const logo = getProviderLogo(subscription.providerCode);
  const providerName = getProviderName(subscription.providerCode);
  const cycle = subscription.plan?.cycle || "monthly";
  const price = subscription.priceOverridePLN || subscription.plan?.pricePLN || 0;
  const isPendingChange = subscription.status === "pending_change";
  const isPendingCancellation = subscription.status === "pending_cancellation";
  const isActive = subscription.status === "active";

  const nextRenewal = getNextRenewalDate(subscription.createdAt, subscription.renewalDay, cycle);
  const nextRenewalStr = nextRenewal.toLocaleDateString("pl-PL");
  const nextBillingStr = getNextBillingDateFromDay(user?.billingDay);

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 16, paddingBottom: 20, paddingHorizontal: 20,
        backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee"
      }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 28 }}>←</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          {logo && (
            <Image source={logo} style={{ width: 64, height: 64, resizeMode: "contain" }} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: "900" }}>{providerName}</Text>
            <Text style={{ fontSize: 14, color: "#666" }}>{subscription.plan?.planName}</Text>
          </View>
          <View style={{
            paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
            backgroundColor: isPendingCancellation ? "rgba(239,68,68,0.12)"
              : isPendingChange ? "rgba(59,130,246,0.12)"
              : "rgba(134,239,172,0.2)",
            borderWidth: 1,
            borderColor: isPendingCancellation ? "rgba(239,68,68,0.4)"
              : isPendingChange ? "rgba(59,130,246,0.4)"
              : "rgba(134,239,172,0.4)",
          }}>
            <Text style={{
              fontSize: 10, fontWeight: "800",
              color: isPendingCancellation ? "#dc2626"
                : isPendingChange ? "#2563eb"
                : "#16a34a"
            }}>
              {isPendingCancellation ? "WYGASA"
                : isPendingChange ? "ZMIANA PLANU"
                : "AKTYWNA"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>

{/* Do dezaktywacji - nad szczegółami planu */}
{isPendingCancellation && (
  <View style={{
    backgroundColor: "#fff5f5", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#fca5a5", gap: 8
  }}>
    <Text style={{ fontSize: 14, fontWeight: "800", color: "#dc2626" }}>
      ⚠️ Subskrypcja do dezaktywacji
    </Text>
    <Text style={{ fontSize: 13, color: "#dc2626", lineHeight: 20 }}>
      Dostęp aktywny do{" "}
      <Text style={{ fontWeight: "700" }}>
        {subscription.activeUntil
          ? new Date(subscription.activeUntil).toLocaleDateString("pl-PL")
          : nextRenewalStr}
      </Text>
      . Po tej dacie dostęp zostanie zakończony.
    </Text>
  </View>
)}

{/* Zmiana planu w toku - nad szczegółami planu */}
{isPendingChange && subscription.pendingPlan && (
  <View style={{
    backgroundColor: "#eff6ff", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#bfdbfe", gap: 10
  }}>
    <Text style={{ fontSize: 14, fontWeight: "800", color: "#1d4ed8" }}>
      🔄 Zmiana planu w toku
    </Text>
    <InfoRow label="Poprzedni plan" value={subscription.plan?.planName} />
    <InfoRow label="Nowy plan" value={subscription.pendingPlan.planName} />
    <InfoRow
      label="Nowa cena"
      value={`${subscription.pendingPlan.pricePLN?.toFixed(2)} zł / ${cycle === "yearly" ? "rok" : "mies"}`}
    />
    <InfoRow
      label="Zmiana aktywna od"
      value={new Date(subscription.createdAt).toLocaleDateString("pl-PL")}
    />
    <InfoRow
      label="Nowa cena od"
      value={nextRenewalStr}
      highlight
    />
  </View>
)}

        {/* Szczegóły planu */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, gap: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 4 }}>Szczegóły planu</Text>
          <InfoRow label="Cena" value={`${price.toFixed(2)} zł / ${cycle === "yearly" ? "rok" : "miesiąc"}`} />
          <InfoRow label="Ekrany" value={String(subscription.plan?.screens ?? "—")} />
          <InfoRow label="Jakość" value={subscription.plan?.uhd ? "4K Ultra HD" : "HD"} />
          <InfoRow label="Reklamy" value={subscription.plan?.ads ? "Tak" : "Nie"} />
          <InfoRow label="Typ cyklu" value={cycle === "yearly" ? "Roczna" : "Miesięczna"} />
        </View>

        {/* Rozliczenie */}
<View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, gap: 14 }}>
  <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 4 }}>Rozliczenie</Text>
  <InfoRow
    label="Aktywna od"
    value={new Date(subscription.createdAt).toLocaleDateString("pl-PL")}
  />
  <InfoRow
    label="Następne odnowienie"
    value={nextRenewalStr}
    highlight
  />
  <InfoRow
    label="Płatność (zbiorcza)"
    value={nextBillingStr}
  />
</View>

      

        {/* Polecane filmy */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", paddingHorizontal: 2 }}>
            Polecane na {providerName}
          </Text>
          {moviesLoading ? (
            <ActivityIndicator color="#000" style={{ marginVertical: 16 }} />
          ) : movies.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={movies}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 2 }}
              renderItem={({ item }) => (
                <View style={{
                  width: 120, backgroundColor: "#fff", borderRadius: 12,
                  overflow: "hidden",
                  shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.07, shadowRadius: 4, elevation: 2
                }}>
                  {item.posterUrl ? (
                    <Image
                      source={{ uri: item.posterUrl }}
                      style={{ width: 120, height: 170, resizeMode: "cover" }}
                    />
                  ) : (
                    <View style={{
                      width: 120, height: 170, backgroundColor: "#f0f0f0",
                      justifyContent: "center", alignItems: "center"
                    }}>
                      <Text style={{ fontSize: 32 }}>🎬</Text>
                    </View>
                  )}
                  <View style={{ padding: 8, gap: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#000" }} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontSize: 10, color: "#999" }}>{item.year}</Text>
                      {item.rating && (
                        <Text style={{ fontSize: 10, color: "#f59e0b", fontWeight: "700" }}>
                          ⭐ {item.rating}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
            />
          ) : (
            <Text style={{ color: "#999", fontSize: 13, paddingHorizontal: 2 }}>
              Brak dostępnych tytułów
            </Text>
          )}
        </View>

        {/* Przyciski akcji */}
        {!isPendingCancellation && (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Pressable
              onPress={handleOpenChangePlan}
              style={{
                padding: 16, backgroundColor: "#fff",
                borderRadius: 14, borderWidth: 1.5, borderColor: "#000",
                alignItems: "center"
              }}
            >
              <Text style={{ fontWeight: "700", fontSize: 15 }}>📋 Zmień plan</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowCancelConfirm(true)}
              style={{
                padding: 16, backgroundColor: "#fff",
                borderRadius: 14, borderWidth: 1.5, borderColor: "#fca5a5",
                alignItems: "center"
              }}
            >
              <Text style={{ color: "#dc2626", fontWeight: "700", fontSize: 15 }}>
                🚫 Zrezygnuj z subskrypcji
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* MODAL: Reaktywacja */}
      <Modal
        visible={showReactivateConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReactivateConfirm(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: "#fff", borderTopLeftRadius: 24,
            borderTopRightRadius: 24, padding: 24
          }}>
            <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 4 }}>
              Reaktywować {providerName}?
            </Text>
            <Text style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>
              {subscription?.plan?.planName} · {price.toFixed(2)} zł/{cycle === "yearly" ? "rok" : "mies"}
            </Text>

            <View style={{ gap: 12, marginBottom: 20 }}>
              <View style={{
                padding: 16, backgroundColor: "#f0fdf4", borderRadius: 12,
                borderWidth: 1, borderColor: "#bbf7d0", gap: 10
              }}>
                <InfoRow label="Następne odnowienie" value={nextRenewalStr} highlight />
                <InfoRow label="Najbliższa płatność zbiorcza" value={nextBillingStr} />
                <InfoRow label="Kwota" value={`${price.toFixed(2)} zł`} />
              </View>
              <View style={{
                padding: 12, backgroundColor: "#fffbeb", borderRadius: 10,
                borderWidth: 1, borderColor: "#fde68a"
              }}>
                <Text style={{ fontSize: 12, color: "#92400e", lineHeight: 18 }}>
                  💡 Subskrypcja zostanie doliczona do najbliższej płatności zbiorczej {nextBillingStr}.
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleReactivateConfirm}
              style={{
                padding: 18, backgroundColor: "#000",
                borderRadius: 14, marginBottom: 12
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 16 }}>
                ✅ Potwierdź reaktywację
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowReactivateConfirm(false)}
              style={{ padding: 14, backgroundColor: "#f0f0f0", borderRadius: 12, alignItems: "center" }}
            >
              <Text style={{ fontWeight: "600" }}>Anuluj</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL: Rezygnacja */}
      <Modal
        visible={showCancelConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelConfirm(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: "#fff", borderTopLeftRadius: 24,
            borderTopRightRadius: 24, padding: 24
          }}>
            <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 4 }}>
              Zrezygnować z {providerName}?
            </Text>
            <Text style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>
              {subscription?.plan?.planName} · {price.toFixed(2)} zł/{cycle === "yearly" ? "rok" : "mies"}
            </Text>

            <View style={{
              padding: 16, backgroundColor: "#fff5f5", borderRadius: 12,
              marginBottom: 20, borderWidth: 1, borderColor: "#fca5a5"
            }}>
              <Text style={{ fontSize: 14, color: "#dc2626", lineHeight: 22 }}>
                • Dostęp do {providerName} zachowasz do{" "}
                <Text style={{ fontWeight: "700" }}>{nextBillingStr}</Text>{"\n"}
                • Przy następnej płatności zbiorczej ta platforma{" "}
                <Text style={{ fontWeight: "700" }}>nie zostanie doliczona</Text>{"\n"}
                • Po tym dniu subskrypcja wygaśnie automatycznie
              </Text>
            </View>

            <Pressable
              onPress={handleCancelSubscription}
              style={{
                padding: 18, backgroundColor: "#dc2626",
                borderRadius: 14, marginBottom: 12
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 16 }}>
                Tak, rezygnuję
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowCancelConfirm(false)}
              style={{ padding: 14, backgroundColor: "#f0f0f0", borderRadius: 12, alignItems: "center" }}
            >
              <Text style={{ fontWeight: "600" }}>Anuluj</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 14, color: "#666" }}>{label}</Text>
      <Text style={{
        fontSize: 14,
        fontWeight: highlight ? "800" : "600",
        color: highlight ? "#000" : "#333"
      }}>
        {value}
      </Text>
    </View>
  );
}