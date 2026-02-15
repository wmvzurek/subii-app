import { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator, Image } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { api } from "../../src/lib/api";
import { storage } from "../../src/lib/storage";
import { getProviderLogo } from "../../src/lib/provider-logos"; // ← DODAJ TO

export default function Home() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  // Załaduj userId przy montowaniu
  useEffect(() => {
    loadUserId();
  }, []);

  // Załaduj subskrypcje gdy userId się zmieni
  useEffect(() => {
    if (userId) {
      loadSubscriptions();
    }
  }, [userId]);

  // Odśwież gdy ekran staje się aktywny
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        console.log("🔄 Screen focused, refreshing subscriptions...");
        loadSubscriptions();
      }
    }, [userId])
  );

  const loadUserId = async () => {
    try {
      const user = await storage.getUser();
      if (user?.id) {
        setUserId(user.id);
        console.log("👤 Loaded userId:", user.id);
      } else {
        router.replace("/login" as any);
      }
    } catch (error) {
      console.error("Error loading user:", error);
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
      
      // NIE FILTRUJ - pokaż wszystkie (pending + active)
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
          Aktywne: {subscriptions.filter(s => s.status === 'active').length} •
          Oczekujące: {subscriptions.filter(s => s.status === 'pending').length}
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
            const isPending = item.status === 'pending';
            const isActive = item.status === 'active';
            const dueDate = new Date(item.nextDueDate);
            const today = new Date();
            const daysUntilActive = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const logo = getProviderLogo(item.providerCode);
            
            return (
              <Pressable
                onPress={() => router.push(`/subscriptions-select-plan?provider=${item.providerCode}` as any)}
                style={{
                  flex: 1,
                  margin: 8,
                  padding: 16,
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                  minHeight: 180,
                  opacity: isPending ? 0.8 : 1,
                  borderWidth: isPending ? 2 : isActive ? 1 : 0,
                  borderColor: isPending ? '#fbbf24' : isActive ? '#86efac' : 'transparent',
                }}
              >
                {/* Badge statusu - PENDING (jasny pomarańczowy) */}
                {isPending && (
                  <View style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    backgroundColor: 'rgba(251, 191, 36, 0.2)', // ← Transparentny pomarańczowy
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(251, 191, 36, 0.4)',
                  }}>
                    <Text style={{ color: '#d97706', fontSize: 9, fontWeight: '700' }}>
                      OCZEKUJE
                    </Text>
                  </View>
                )}

                {/* Badge statusu - ACTIVE (jasny zielony) */}
                {isActive && (
                  <View style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    backgroundColor: 'rgba(134, 239, 172, 0.2)', // ← Transparentny zielony
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(134, 239, 172, 0.4)',
                  }}>
                    <Text style={{ color: '#16a34a', fontSize: 9, fontWeight: '700' }}>
                      AKTYWNA
                    </Text>
                  </View>
                )}

                {/* Logo providera - TYLKO LOGO, BEZ NAZWY */}
                {logo && (
                  <View style={{ alignItems: 'center', marginBottom: 12 }}>
                    <Image
                      source={logo}
                      style={{ 
                        width: 60, 
                        height: 60,
                        resizeMode: 'contain'
                      }}
                    />
                  </View>
                )}

                {/* Nazwa planu */}
                <Text style={{ 
                  fontSize: 12, 
                  color: '#666', 
                  marginBottom: 8,
                  textAlign: 'center'
                }}>
                  {item.plan.planName}
                </Text>
                
                {/* Cena */}
                <Text style={{ 
                  fontSize: 20, 
                  fontWeight: '800', 
                  marginTop: 'auto',
                  textAlign: 'center'
                }}>
                  {(item.priceOverridePLN || item.plan.pricePLN).toFixed(2)} zł
                </Text>
                
                {/* Data - różna dla pending vs active */}
                {isPending ? (
                  <Text style={{ 
                    fontSize: 11, 
                    color: '#d97706', 
                    marginTop: 4, 
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    Aktywacja: {daysUntilActive === 0 ? 'Dzisiaj' : daysUntilActive === 1 ? 'Jutro' : `Za ${daysUntilActive} dni`}
                  </Text>
                ) : (
                  <Text style={{ 
                    fontSize: 11, 
                    color: '#999', 
                    marginTop: 4,
                    textAlign: 'center'
                  }}>
                    Płatność: {new Date(item.nextDueDate).toLocaleDateString('pl-PL')}
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