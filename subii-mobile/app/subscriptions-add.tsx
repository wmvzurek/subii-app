import { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  Pressable, 
  Alert, 
  ActivityIndicator, 
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { plansApi, subscriptionsApi } from "../src/lib/api";
import { storage } from "../src/lib/storage";
import { getProviderLogo } from "../src/lib/provider-logos";

export default function SubscriptionsAdd() {
  const router = useRouter();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userSubscriptions, setUserSubscriptions] = useState<string[]>([]);

  useEffect(() => {
    checkUser();
    loadProviders();
  }, []);

  const checkUser = async () => {
    const savedUser = await storage.getUser();
    setUser(savedUser);
    
    if (!savedUser?.emailVerified) {
      Alert.alert(
        "Weryfikacja wymagana",
        "Aby dodawać subskrypcje, musisz najpierw zweryfikować swój adres email.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  };

  const loadProviders = async () => {
    try {
      const res = await plansApi.getAll();
      const plans = res.plans || [];
      
      // Pobierz aktywne subskrypcje użytkownika - NIE blokuj wyboru
      // const activeCodes = await subscriptionsApi.getActiveProviderCodes();
      // setUserSubscriptions(activeCodes);
      
      // Grupuj plany po providerCode
      const providerMap = new Map();
      plans.forEach((plan: any) => {
        if (!providerMap.has(plan.providerCode)) {
          providerMap.set(plan.providerCode, {
            code: plan.providerCode,
            name: getProviderName(plan.providerCode),
            logo: getProviderLogo(plan.providerCode),
            plansCount: 0
          });
        }
        const provider = providerMap.get(plan.providerCode);
        provider.plansCount++;
      });

      setProviders(Array.from(providerMap.values()));
    } catch (error) {
      Alert.alert("Błąd", "Nie udało się pobrać providerów");
    } finally {
      setLoading(false);
    }
  };

  const getProviderName = (code: string): string => {
    const names: Record<string, string> = {
      netflix: 'Netflix',
      disney_plus: 'Disney+',
      prime_video: 'Prime Video',
      hbo_max: 'Max',
      apple_tv: 'Apple TV+',
    };
    return names[code] || code;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ padding: 20, paddingTop: 60, backgroundColor: '#fff' }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 28 }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 28, fontWeight: '800' }}>Wybierz platformę</Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          Dostępne: {providers.length}
        </Text>
      </View>

      <FlatList
        data={providers}
        numColumns={2}
        contentContainerStyle={{ padding: 16 }}
        keyExtractor={(item) => item.code}
         renderItem={({ item }) => {
          // USUŃ TO CAŁKOWICIE - nie blokuj wyboru platformy
          // const isSubscribed = userSubscriptions.includes(item.code);
          
          return (
            <Pressable
              onPress={() => {
                router.push(`/subscriptions-select-plan?provider=${item.code}` as any);
              }}
              style={{
                flex: 1,
                margin: 8,
                padding: 20,
                backgroundColor: '#fff',
                borderRadius: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                minHeight: 160,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.logo && (
                <Image
                  source={item.logo}
                  style={{ 
                    width: 80, 
                    height: 80, 
                    marginBottom: 12,
                    resizeMode: 'contain'
                  }}
                />
              )}
              
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '700', 
                textAlign: 'center',
                marginBottom: 4
              }}>
                {item.name}
              </Text>
              
              <Text style={{ 
                fontSize: 12, 
                color: '#999',
                marginTop: 4
              }}>
                {item.plansCount} {item.plansCount === 1 ? 'plan' : 'planów'}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}