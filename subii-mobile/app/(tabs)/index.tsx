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
 * Funkcja pomocnicza obliczająca datę kolejnego odnowienia subskrypcji.
 * 
 * Logika:
 * - yearly → dodaje kolejne lata do daty utworzenia aż przekroczy dzisiejszą datę
 * - monthly → wylicza najbliższy renewalDay w bieżącym lub następnym miesiącu
 */
function getNextRenewalDate(
  createdAt: string,
  renewalDay: number,
  cycle: string = "monthly"
): Date {
  const created = new Date(createdAt);
  const today = new Date();

  // Jeżeli subskrypcja roczna — zwiększamy rok aż data będzie w przyszłości
  if (cycle === "yearly") {
    const next = new Date(created);
    while (next <= today) {
      next.setFullYear(next.getFullYear() + 1);
    }
    return next;
  }

  // Jeżeli miesięczna — sprawdzamy najbliższy renewalDay
  const candidate = new Date(today.getFullYear(), today.getMonth(), renewalDay);
  if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
  return candidate;
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // pozwala uwzględnić bezpieczne obszary (notch, dynamic island)

  // Stan przechowujący listę subskrypcji z backendu
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Stan do obsługi pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // Stan globalnego ładowania ekranu
  const [loading, setLoading] = useState(true);

  // ID aktualnie zalogowanego użytkownika
  const [userId, setUserId] = useState<number | null>(null);

  // Obiekt usera (może zawierać dane billingowe itp.)
  const [userWithBilling, setUserWithBilling] = useState<any>(null);

  /**
   * useEffect uruchamiany przy pierwszym renderze
   * Wczytuje użytkownika z local storage
   */
  useEffect(() => {
    loadUserId();
  }, []);

  /**
   * Po ustawieniu userId pobieramy subskrypcje z backendu
   */
  useEffect(() => {
    if (userId) loadSubscriptions();
  }, [userId]);

  /**
   * useFocusEffect uruchamia się przy każdym powrocie na ekran
   * (np. po dodaniu nowej subskrypcji)
   */
  useFocusEffect(
    useCallback(() => {
      if (userId) loadSubscriptions();
    }, [userId])
  );

  /**
   * Pobiera usera z AsyncStorage.
   * Jeśli nie ma usera → przekierowanie do logowania.
   */
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

  /**
   * Pobiera subskrypcje z backendowego API.
   * Jeśli backend zwróci 401 → wylogowanie.
   */
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

  /**
   * Funkcja obsługująca pull-to-refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
    setRefreshing(false);
  };

  /**
   * Jeśli ekran jest w trakcie ładowania → pokazujemy loader
   */
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

  /**
   * Obliczenie łącznego kosztu miesięcznego.
   * Subskrypcje roczne przeliczane są na koszt miesięczny (price / 12).
   */
  const totalMonthly = subscriptions.reduce((sum, s) => {
    const price = s.priceOverridePLN || s.plan?.pricePLN || 0;
    if (s.plan?.cycle === "yearly") return sum + price / 12;
    return sum + price;
  }, 0);

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      
      {/* ================= HEADER ================= */}
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
            alignItems: "center",
          }}
        >
          <View>
            {/* Tytuł ekranu */}
            <Text style={{ fontSize: 28, fontWeight: "800" }}>
              Moje subskrypcje
            </Text>

            {/* Liczba aktywnych + suma miesięczna */}
            <Text style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
              {subscriptions.length} aktywnych · {totalMonthly.toFixed(2)} zł/mies
            </Text>
          </View>

          {/* Przycisk dodawania nowej subskrypcji */}
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

      {/* ================= TREŚĆ ================= */}
      {subscriptions.length === 0 ? (
        /**
         * Widok pustej listy (empty state)
         */
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
        /**
         * Lista subskrypcji renderowana przez FlatList
         */
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
            // Pobranie logo dostawcy (Netflix, Disney itd.)
            const logo = getProviderLogo(item.providerCode);

            // Sprawdzenie statusu subskrypcji
            const isPendingChange = item.status === "pending_change";
            const isPendingCancellation = item.status === "pending_cancellation";
            const isActive = item.status === "active";

            // Dynamiczne kolory badge w zależności od statusu
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
              ? "WYGASA"
              : isPendingChange
              ? "ZMIANA PLANU"
              : "AKTYWNA";

            const cycle = item.plan?.cycle || "monthly";
            const nextRenewal = getNextRenewalDate(
              item.createdAt,
              item.renewalDay,
              cycle
            );
            const nextRenewalStr = nextRenewal.toLocaleDateString("pl-PL");
            const price = item.priceOverridePLN || item.plan?.pricePLN || 0;

            /**
             * Pojedynczy kafelek subskrypcji
             */
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
                }}
              >
                {/* Logo dostawcy */}
                {logo && (
                  <Image
                    source={logo}
                    style={{
                      width: 68,
                      height: 68,
                      resizeMode: "contain",
                      marginRight: 14,
                    }}
                  />
                )}

                {/* Środkowa część kafelka */}
                <View style={{ flex: 1 }}>
                  
                  {/* Górny wiersz: nazwa + badge statusu */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: "#000",
                        flex: 1,
                        marginRight: 10,
                      }}
                      numberOfLines={1}
                    >
                      {item.provider?.name || item.providerCode}
                    </Text>

                    {/* Badge statusu */}
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: badgeBg,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: badgeBorder,
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

                  {/* Plan + cykl płatności */}
                  <Text
                    style={{ fontSize: 13, color: "#666" }}
                    numberOfLines={1}
                  >
                    {item.plan?.planName} ·{" "}
                    {cycle === "yearly" ? "roczna" : "miesięczna"}
                  </Text>
                </View>

                {/* Chevron wskazujący możliwość przejścia do szczegółów */}
                <Text
                  style={{
                    fontSize: 20,
                    color: "#c7c7c7",
                    marginLeft: 10,
                    fontWeight: "400",
                  }}
                >
                  ›
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}