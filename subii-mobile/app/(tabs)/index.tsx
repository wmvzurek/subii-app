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
import { Ionicons } from "@expo/vector-icons";

/**
 * Funkcja pomocnicza obliczająca datę następnego odnowienia subskrypcji.
 *
 * Zasady działania:
 * - yearly → zwiększa rok od daty utworzenia aż wyliczona data będzie w przyszłości
 * - monthly → wyznacza najbliższy renewalDay w bieżącym lub kolejnym miesiącu
 */

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // uwzględnia bezpieczne obszary (notch / dynamic island)

  // Lista subskrypcji pobrana z backendu
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Stan obsługujący mechanizm pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // Globalny stan ładowania ekranu
  const [loading, setLoading] = useState(true);

  // ID aktualnie zalogowanego użytkownika
  const [userId, setUserId] = useState<number | null>(null);

  // Dane użytkownika (np. informacje billingowe)
  const [userWithBilling, setUserWithBilling] = useState<any>(null);

  /**
   * useEffect uruchamiany przy pierwszym renderze komponentu.
   * Pobiera użytkownika z lokalnego storage.
   */
  useEffect(() => {
    loadUserId();
  }, []);

  /**
   * Po ustawieniu userId pobierane są subskrypcje z API.
   */
  useEffect(() => {
    if (userId) loadSubscriptions();
  }, [userId]);

  /**
   * useFocusEffect wywoływany przy każdym powrocie na ekran.
   * Pozwala odświeżyć dane np. po dodaniu nowej subskrypcji.
   */
  useFocusEffect(
    useCallback(() => {
      if (userId) loadSubscriptions();
    }, [userId])
  );

  /**
   * Pobiera dane użytkownika z AsyncStorage.
   * Jeśli brak danych – następuje przekierowanie do logowania.
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
   * Pobiera listę subskrypcji z backendowego API.
   * W przypadku błędu 401 następuje wyczyszczenie sesji i wylogowanie.
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
   * Obsługa gestu pull-to-refresh.
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
    setRefreshing(false);
  };

  /**
   * Widok ładowania wyświetlany do momentu pobrania danych.
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
   * Subskrypcje roczne są przeliczane proporcjonalnie (price / 12).
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
            {/* Tytuł sekcji */}
            <Text style={{ fontSize: 28, fontWeight: "800" }}>
              Moje subskrypcje
            </Text>

            {/* Informacja o liczbie aktywnych subskrypcji i łącznym koszcie */}
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
              backgroundColor: "transparent",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="add" size={26} color="#000" />
          </Pressable>
        </View>
      </View>

      {/* ================= TREŚĆ ================= */}
      {subscriptions.length === 0 ? (
        /**
         * Widok pustej listy (empty state),
         * wyświetlany gdy użytkownik nie ma żadnych subskrypcji.
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
            Nie masz jeszcze żadnych subskrypcji.
          </Text>

          {/* CTA do dodania pierwszej subskrypcji */}
          <Pressable
            onPress={() => router.push("/subscriptions-add" as any)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              paddingHorizontal: 20,
              backgroundColor: "#000",
              borderRadius: 14,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text
              style={{
                color: "#fff",
                fontWeight: "700",
                fontSize: 15,
                letterSpacing: 0.3,
              }}
            >
              Dodaj subskrypcję
            </Text>
          </Pressable>
        </View>
      ) : (
        /**
         * Lista subskrypcji renderowana przez komponent FlatList.
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
            // Pobranie logo dostawcy (np. Netflix, Disney+)
            const logo = getProviderLogo(item.providerCode);

            // Status subskrypcji
            const isPendingChange = item.status === "pending_change";
            const isPendingCancellation = item.status === "pending_cancellation";
            const isActive = item.status === "active";

            // Dynamiczne kolory badge zależne od statusu
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
              ? "ANULOWANA"
              : isPendingChange
              ? "ZMIANA PLANU"
              : "AKTYWNA";

            const cycle = item.plan?.cycle || "monthly";
const nextRenewalStr = item.nextRenewalDate
  ? new Date(item.nextRenewalDate).toLocaleDateString("pl-PL")
  : "—";
            const price = item.priceOverridePLN || item.plan?.pricePLN || 0;

            /**
             * Render pojedynczego kafelka subskrypcji.
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

                {/* Środkowa sekcja z informacjami o subskrypcji */}
                <View style={{ flex: 1 }}>
                  
                  {/* Nazwa dostawcy + badge statusu */}
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

                    {/* Status subskrypcji */}
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

                  {/* Nazwa planu + cykl rozliczeniowy */}
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