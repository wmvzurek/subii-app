import { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator, Image } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { api } from "../../src/lib/api";
import { storage } from "../../src/lib/storage";
import { getProviderLogo } from "../../src/lib/provider-logos";

export default function Home() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const getNextBillingDateStr = (billingDay?: number): string => {
  if (!billingDay) return "—";
  const today = new Date();
  const candidate = new Date(today.getFullYear(), today.getMonth(), billingDay);
  if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
  return candidate.toLocaleDateString("pl-PL");
};

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      loadSubscriptions();
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        console.log("🔄 Screen focused, refreshing subscriptions...");
        loadSubscriptions();
      }
    }, [userId])
  );

  const [userWithBilling, setUserWithBilling] = useState<any>(null);

const loadUserId = async () => {
  try {
    const user = await storage.getUser();
    if (user?.id) {
      setUserId(user.id);
      setUserWithBilling(user);
    } else {
      router.replace("/login" as any);
    }
  } catch (error) {
    router.replace("/login" as any);
  }
};

  const loadSubscriptions = async () => {
    try {
      const token = await storage.getToken();
      const user = await storage.getUser();

      console.log("👤 User:", user?.email, "ID:", user?.id);

      if (!token || !user) {
        console.log("❌ No token/user");
        router.replace("/login" as any);
        return;
      }

      console.log("📡 Fetching subscriptions...");
      const res = await api.get('/api/subscriptions');
      const all = res.data.subscriptions || [];

      console.log("✅ Loaded", all.length, "subscriptions");
      setSubscriptions(all);
    } catch (error: any) {
      console.error('❌ Error:', error.response?.status, error.message);

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
    await loadSubscriptions();
    setRefreshing(false);
  };

  // Oblicz następne odnowienie na podstawie renewalDay
  const getNextRenewalDate = (renewalDay: number): string => {
    const today = new Date();
    const candidate = new Date(today.getFullYear(), today.getMonth(), renewalDay);
    if (candidate <= today) {
      candidate.setMonth(candidate.getMonth() + 1);
    }
    return candidate.toLocaleDateString('pl-PL');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ padding: 20, paddingTop: 60, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 28, fontWeight: '800' }}>Moje subskrypcje</Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          Aktywne subskrypcje: {subscriptions.length}
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#000"
              title="Odświeżanie..."
            />
          }
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
  const logo = getProviderLogo(item.providerCode);
  const isPendingChange = item.status === "pending_change";
  const isPendingCancellation = item.status === "pending_cancellation";
  const isActive = item.status === "active";

  // Kolor bordera i badge
  const borderColor = isPendingCancellation
    ? "rgba(239,68,68,0.4)"
    : isPendingChange
    ? "rgba(59,130,246,0.4)"
    : "rgba(134,239,172,0.4)";

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

  return (
    <Pressable
      onPress={() => router.push(`/subscriptions-select-plan?provider=${item.providerCode}` as any)}
      style={{
        flex: 1, margin: 8, padding: 16,
        backgroundColor: "#fff", borderRadius: 12,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
        minHeight: 180,
        borderWidth: 1.5, borderColor,
      }}
    >
      <View style={{
        position: "absolute", top: 8, right: 8,
        paddingHorizontal: 8, paddingVertical: 4,
        backgroundColor: badgeBg,
        borderRadius: 8, borderWidth: 1, borderColor: badgeBorder,
      }}>
        <Text style={{ color: badgeColor, fontSize: 9, fontWeight: "700" }}>
          {badgeText}
        </Text>
      </View>

      {logo && (
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <Image source={logo} style={{ width: 60, height: 60, resizeMode: "contain" }} />
        </View>
      )}

      <Text style={{ fontSize: 12, color: "#666", marginBottom: 8, textAlign: "center" }}>
        {item.plan.planName}
        {isPendingChange && item.pendingPlan && (
          <Text style={{ color: "#2563eb" }}> → {item.pendingPlan.planName}</Text>
        )}
      </Text>

      <Text style={{ fontSize: 20, fontWeight: "800", marginTop: "auto", textAlign: "center" }}>
        {(item.priceOverridePLN || item.plan.pricePLN).toFixed(2)} zł
      </Text>

      {isPendingCancellation && item.activeUntil && (
        <Text style={{ fontSize: 11, color: "#dc2626", marginTop: 4, textAlign: "center", fontWeight: "600" }}>
          Aktywna do: {new Date(item.activeUntil).toLocaleDateString("pl-PL")}
        </Text>
      )}
      {isPendingChange && (
        <Text style={{ fontSize: 11, color: "#2563eb", marginTop: 4, textAlign: "center", fontWeight: "600" }}>
          Zmiana: {getNextBillingDateStr(userWithBilling?.billingDay)}
        </Text>
      )}
      {isActive && (
        <Text style={{ fontSize: 11, color: "#999", marginTop: 4, textAlign: "center" }}>
          Odnowienie: {item.renewalDay}. każdego mies.
        </Text>
      )}
    </Pressable>
  );
}}
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