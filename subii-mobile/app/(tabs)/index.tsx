import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { api } from "../../src/lib/api";
import { storage } from "../../src/lib/storage";
import { getProviderLogo } from "../../src/lib/provider-logos";

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [userWithBilling, setUserWithBilling] = useState<any>(null);
  const [sendingVerification, setSendingVerification] = useState(false);

  const BG = "#f5f5f5";
  const WHITE = "#fff";
  const BLACK = "#252729";
  const MUTED = "#666";
  const LIGHT_MUTED = "#999";
  const BORDER_LIGHT = "#e6e6e6";
  const WARNING_BG = "#fef3c7";
  const WARNING_BORDER = "#fde68a";
  const WARNING_ICON = "#d97706";
  const WARNING_TEXT = "#92400e";

  const FONT_REGULAR = "Inter_400Regular";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";
 
  const handleResendVerification = useCallback(async () => {
    setSendingVerification(true);
    try {
      await api.post("/api/auth/resend-verification");
      Alert.alert("Wysłano!", "Sprawdź swoją skrzynkę email.");
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się wysłać emaila.");
    } finally {
      setSendingVerification(false);
    }
  }, []);

  const loadUserId = useCallback(async () => {
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
  }, [router]);

  const loadSubscriptions = useCallback(async () => {
    try {
      const token = await storage.getToken();
      const user = await storage.getUser();

      if (!token || !user) {
        router.replace("/login" as any);
        return;
      }

      const [subsRes, meRes] = await Promise.all([
        api.get("/api/subscriptions"),
        api.get("/api/auth/me").catch(() => null),
      ]);

      setSubscriptions(subsRes.data.subscriptions || []);

      if (meRes?.data?.user) {
        const freshUser = { ...user, ...meRes.data.user };
        await storage.setUser(freshUser);
        setUserWithBilling(freshUser);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        await storage.clearAuth();
        router.replace("/login" as any);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSubscriptions();
    setRefreshing(false);
  }, [loadSubscriptions]);

  useEffect(() => {
    loadUserId();
  }, [loadUserId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) loadSubscriptions();
    }, [userId, loadSubscriptions])
  );

  const totalMonthly = subscriptions.reduce((sum, s) => {
    const price = s.priceOverridePLN || s.plan?.pricePLN || 0;
    if (s.plan?.cycle === "yearly") return sum + price / 12;
    return sum + price;
  }, 0);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: BG,
        }}
      >
        <ActivityIndicator size="large" color={BLACK} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View
        style={{
          padding: 20,
          paddingTop: insets.top + 10,
          backgroundColor: WHITE,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ gap: 10 }}>
            <Text
              style={{
                fontSize: 28,
                color: BLACK,
                fontFamily: FONT_SEMI,
              }}
            >
              Moje subskrypcje
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: MUTED,
                fontFamily: FONT_REGULAR,
              }}
            >
              {subscriptions.length} aktywnych · {totalMonthly.toFixed(2)} zł/mies
            </Text>
          </View>

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
            <Ionicons name="add" size={26} color={BLACK} />
          </Pressable>
        </View>
      </View>

      {userWithBilling && !userWithBilling.emailVerified && (
        <Pressable
          onPress={handleResendVerification}
          disabled={sendingVerification}
          style={({ pressed }) => ({
            backgroundColor: WARNING_BG,
            paddingVertical: 12,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            borderBottomWidth: 1,
            borderBottomColor: WARNING_BORDER,
            opacity: pressed || sendingVerification ? 0.85 : 1,
          })}
        >
          <Ionicons name="warning-outline" size={20} color={WARNING_ICON} />
          <Text
            style={{
              flex: 1,
              fontSize: 11,
              color: WARNING_TEXT,
              fontFamily: FONT_SEMI,
            }}
          >
            Zweryfikuj adres e-mail, aby móc dodawać subskrypcje. Naciśnij, aby
            ponownie wysłać link weryfikacyjny.
          </Text>
        </Pressable>
      )}

      {subscriptions.length === 0 ? (
        <ScrollView
          contentContainerStyle={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BLACK}
            />
          }
        >
          <Text
            style={{
              fontSize: 14,
              color: LIGHT_MUTED,
              textAlign: "center",
              marginBottom: 16,
              fontFamily: FONT_REGULAR,
            }}
          >
            Nie masz jeszcze żadnych subskrypcji.
          </Text>

          <Pressable
            onPress={() => router.push("/subscriptions-add" as any)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 16,
              paddingHorizontal: 20,
              backgroundColor: BLACK,
              borderRadius: 12,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="add" size={18} color={WHITE} />
            <Text
              style={{
                color: WHITE,
                textAlign: "center",
                fontSize: 14,
                fontFamily: FONT_SEMI,
              }}
            >
              Dodaj subskrypcję
            </Text>
          </Pressable>
        </ScrollView>
      ) : (
        <FlatList
          data={subscriptions}
          numColumns={1}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BLACK}
            />
          }
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const logo = getProviderLogo(item.providerCode);

            const isPendingChange = item.status === "pending_change";
            const isPendingCancellation = item.status === "pending_cancellation";

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
            const price = item.priceOverridePLN || item.plan?.pricePLN || 0;

            const nextRenewalStr = item.nextRenewalDate
              ? new Date(item.nextRenewalDate).toLocaleDateString("pl-PL")
              : "—";

            return (
              <Pressable
                onPress={() =>
                  router.navigate(`/subscription-detail?id=${item.id}` as any)
                }
                style={{
                  padding: 16,
                  backgroundColor: WHITE,
                  borderRadius: 12,
                  shadowColor: BLACK,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 3,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
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

                <View style={{ flex: 1 }}>
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
                        fontSize: 17,
                        color: BLACK,
                        flex: 1,
                        marginRight: 10,
                        fontFamily: FONT_BOLD,
                      }}
                      numberOfLines={1}
                    >
                      {item.provider?.name || item.providerCode}
                    </Text>

                    <View
                      style={{
                        width: 90,
                        paddingVertical: 4,
                        backgroundColor: badgeBg,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: badgeBorder,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: badgeColor,
                          fontSize: 9,
                          fontFamily: FONT_BOLD,
                        }}
                      >
                        {badgeText}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={{
                      fontSize: 12,
                      color: MUTED,
                      fontFamily: FONT_REGULAR,
                    }}
                    numberOfLines={1}
                  >
                    {item.plan?.planName} · {cycle === "yearly" ? "roczna" : "miesięczna"}
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 20,
                    color: "#c7c7c7",
                    marginLeft: 10,
                    fontFamily: FONT_REGULAR,
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