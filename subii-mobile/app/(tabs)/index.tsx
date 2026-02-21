import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { api } from "../../src/lib/api";
import { storage } from "../../src/lib/storage";
import { getProviderLogo } from "../../src/lib/provider-logos";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Liczy datę kolejnego odnowienia subskrypcji:
 * - yearly: co rok od createdAt
 * - monthly: najbliższy renewalDay po dzisiejszej dacie
 */
function getNextRenewalDate(
  createdAt: string,
  renewalDay: number,
  cycle: string = "monthly"
): Date {
  const created = new Date(createdAt);
  const today = new Date();

  if (cycle === "yearly") {
    const next = new Date(created);
    while (next <= today) {
      next.setFullYear(next.getFullYear() + 1);
    }
    return next;
  }

  // monthly - następny renewalDay po dziś
  const candidate = new Date(today.getFullYear(), today.getMonth(), renewalDay);
  if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
  return candidate;
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Lista subskrypcji pobrana z backendu
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Stan odświeżania listy (pull-to-refresh)
  const [refreshing, setRefreshing] = useState(false);

  // Stan ładowania ekranu
  const [loading, setLoading] = useState(true);

  // Id użytkownika z local storage
  const [userId, setUserId] = useState<number | null>(null);

  // User z danymi billingowymi (jeśli używasz gdzieś indziej)
  const [userWithBilling, setUserWithBilling] = useState<any>(null);

  /** Wczytaj usera z storage przy starcie */
  useEffect(() => {
    loadUserId();
  }, []);

  /** Po ustawieniu userId pobierz subskrypcje */
  useEffect(() => {
    if (userId) loadSubscriptions();
  }, [userId]);

  /** Przy powrocie na ekran odśwież subskrypcje */
  useFocusEffect(
    useCallback(() => {
      if (userId) loadSubscriptions();
    }, [userId])
  );

  /** Ładuje usera z local storage (jak brak -> przerzuca do login) */
  const loadUserId = async () => {
    try {
      const user = await storage.getUser();
      if (user?.id) {
        setUserId(user.id);
        setUserWithBilling(user);
      } else {
        router.replace("/login" as any);
      }
    } catch {
      router.replace("/login" as any);
    }
  };

  /** Pobiera subskrypcje z API (jak 401 -> wylogowanie) */
  const loadSubscriptions = async () => {
    try {
      const token = await storage.getToken();
      const user = await storage.getUser();

      if (!token || !user) {
        router.replace("/login" as any);
        return;
      }

      const res = await api.get("/api/subscriptions");
      setSubscriptions(res.data.subscriptions || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        await storage.clearAuth();
        router.replace("/login" as any);
      }
    } finally {
      setLoading(false);
    }
  };

  /** Pull-to-refresh */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
    setRefreshing(false);
  };

  /** Loader ekranu */
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  /** Suma miesięczna (roczne liczone jako /12) */
  const totalMonthly = subscriptions.reduce((sum, s) => {
    const price = s.priceOverridePLN || s.plan?.pricePLN || 0;
    if (s.plan?.cycle === "yearly") return sum + price / 12;
    return sum + price;
  }, 0);

  return (
    // Główny wrapper ekranu
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* HEADER: tytuł + (plus) wycentrowany do dwóch linii tekstu */}
      <View
        style={{
          padding: 20,
          paddingTop: insets.top + 10,
          backgroundColor: "#fff",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center", // <-- to centruje plus względem całego bloku tekstu
          }}
        >
          {/* BLOK TEKSTOWY (2 linie jako jeden element) */}
          <View>
            <Text style={{ fontSize: 28, fontWeight: "800" }}>
              Moje subskrypcje
            </Text>
            <Text style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
              {subscriptions.length} aktywnych · {totalMonthly.toFixed(2)} zł/mies
            </Text>
          </View>

          {/* Przycisk dodania subskrypcji w nagłówku */}
          <Pressable
            onPress={() => router.push("/subscriptions-add" as any)}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 21,
              borderWidth: 2,
              borderColor: "#000",
              backgroundColor: "transparent",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "900",
                color: "#000",
                textAlign: "center",
              }}
            >
              +
            </Text>
          </Pressable>
        </View>
      </View>

      {/* TREŚĆ: pusta lista vs lista subskrypcji */}
      {subscriptions.length === 0 ? (
        // Widok pusty
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: "#999",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            Nie masz jeszcze żadnych subskrypcji
          </Text>

          <Pressable
            onPress={() => router.push("/subscriptions-add" as any)}
            style={{ padding: 14, backgroundColor: "#000", borderRadius: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              ➕ Dodaj pierwszą subskrypcję
            </Text>
          </Pressable>
        </View>
      ) : (
        // Lista subskrypcji
        <FlatList
          data={subscriptions}
          numColumns={1}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#000"
            />
          }
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const logo = getProviderLogo(item.providerCode);

            // Statusy subskrypcji
            const isPendingChange = item.status === "pending_change";
            const isPendingCancellation = item.status === "pending_cancellation";
            const isActive = item.status === "active"; // zostawione jak w Twoim kodzie

            // Badge kolory (UI)
            const badgeBg = isPendingCancellation
              ? "rgba(239,68,68,0.15)"
              : isPendingChange
              ? "rgba(59,130,246,0.15)"
              : "rgba(134,239,172,0.2)";

            const badgeBorder = isPendingCancellation
              ? "rgba(239,68,68,0.4)"
              : isPendingChange
              ? "rgba(59,130,246,0.4)"
              : "rgba(134,239,172,0.4)";

            const badgeColor = isPendingCancellation
              ? "#dc2626"
              : isPendingChange
              ? "#2563eb"
              : "#16a34a";

            const badgeText = isPendingCancellation
              ? "DO DEZAKTYWACJI"
              : isPendingChange
              ? "ZMIANA PLANU"
              : "AKTYWNA";

            // Dane do wyświetlenia
            const cycle = item.plan?.cycle || "monthly";
            const nextRenewal = getNextRenewalDate(
              item.createdAt,
              item.renewalDay,
              cycle
            );
            const nextRenewalStr = nextRenewal.toLocaleDateString("pl-PL");
            const price = item.priceOverridePLN || item.plan?.pricePLN || 0;

            return (
              <Pressable
                onPress={() =>
                  router.navigate(`/subscription-detail?id=${item.id}` as any)
                }
                style={{
                  padding: 16,
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 3,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 15,
                }}
              >
                {/* Logo dostawcy */}
                {logo && (
                  <Image
                    source={logo}
                    style={{ width: 56, height: 56, resizeMode: "contain" }}
                  />
                )}

                <View style={{ flex: 1, justifyContent: "center", gap: 12 }}>
                  {/* Nazwa + badge */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: "#000",
                      }}
                    >
                      {item.provider?.name || item.providerCode}
                    </Text>

                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        backgroundColor: badgeBg,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: badgeBorder,
                        marginRight: -15,
                      }}
                    >
                      <Text
                        style={{
                          color: badgeColor,
                          fontSize: 9,
                          fontWeight: "700",
                        }}
                      >
                        {badgeText}
                      </Text>
                    </View>
                  </View>

                  {/* Plan + cykl */}
                  <Text style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>
                    {item.plan?.planName} ·{" "}
                    {cycle === "yearly" ? "roczna" : "miesięczna"}
                  </Text>

                  {/* Cena + info o odnowieniu / końcu */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontSize: 20, fontWeight: "800", color: "#000" }}>
                      {price.toFixed(2)} zł
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "400",
                          color: "#999",
                        }}
                      >
                        {cycle === "yearly" ? "/rok" : "/mies"}
                      </Text>
                    </Text>

                    <View style={{ alignItems: "flex-end", marginRight: -15 }}>
                      {isPendingCancellation && item.activeUntil ? (
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#dc2626",
                            fontWeight: "600",
                          }}
                        >
                          Do:{" "}
                          {new Date(item.activeUntil).toLocaleDateString("pl-PL")}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 9, color: "#999" }}>
                          Odnowienie: {nextRenewalStr}
                        </Text>
                      )}

                      {isPendingChange && item.pendingPlan && (
                        <Text
                          style={{
                            fontSize: 9,
                            color: "#2563eb",
                            fontWeight: "600",
                          }}
                        >
                          → {item.pendingPlan.planName}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Strzałka do szczegółów */}
                <Text style={{ fontSize: 18, color: "#ccc" }}>›</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}