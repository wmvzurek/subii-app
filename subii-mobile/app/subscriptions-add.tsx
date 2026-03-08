import { useState, useEffect } from "react";
import {
  View, Text, FlatList, Pressable, Alert,
  ActivityIndicator, Image, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { plansApi, subscriptionsApi, api } from "../src/lib/api";
import { storage } from "../src/lib/storage";
import { getProviderLogo } from "../src/lib/provider-logos";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getProviderName } from "../src/lib/provider-logos";
import { CardField, useStripe } from "@stripe/stripe-react-native";

const BILLING_DAYS = [1, 4, 8, 12, 16, 20,24, 28];

export default function SubscriptionsAdd() {
  const router = useRouter();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showBillingSetup, setShowBillingSetup] = useState(false);
  const [selectedBillingDay, setSelectedBillingDay] = useState<number | null>(null);
  const [savingBillingDay, setSavingBillingDay] = useState(false);
  const [showCardSetup, setShowCardSetup] = useState(false);
const [savingCard, setSavingCard] = useState(false);
  const insets = useSafeAreaInsets();
  const { confirmSetupIntent } = useStripe();
const [newCardDetails, setNewCardDetails] = useState<any>(null);

  useEffect(() => {
    initScreen();
  }, []);

  const initScreen = async () => {
    setLoading(true);
    try {
      const savedUser = await storage.getUser();
      setUser(savedUser);

      if (!savedUser?.emailVerified) {
        Alert.alert(
          "Weryfikacja wymagana",
          "Aby dodawać subskrypcje, musisz najpierw zweryfikować swój adres email.",
          [{ text: "OK", onPress: () => router.back() }]
        );
        return;
      }

      // Sprawdź czy potrzebny billing setup
      if (!savedUser?.billingDay) {
        const res = await subscriptionsApi.getAll();
        const hasAny = (res?.subscriptions || []).length > 0;
        if (!hasAny) {
          // Pokaż billing setup wewnątrz tego ekranu
          setShowBillingSetup(true);
          setLoading(false);
          return;
        }
      }

      // Sprawdź czy user ma zapisaną kartę
      const cardRes = await api.get("/api/stripe/card");
      if (!cardRes.data.card) {
        setShowCardSetup(true);
        setLoading(false);
        return;
      }

      await loadProviders();
    } catch (e: any) {
      console.error("[initScreen] błąd:", e);
      await loadProviders();
    }
  };

  const loadProviders = async () => {
    try {
      const res = await plansApi.getAll();
      const plans = res.plans || [];

      const providerMap = new Map();
      plans.forEach((plan: any) => {
        if (!providerMap.has(plan.providerCode)) {
          providerMap.set(plan.providerCode, {
            code: plan.providerCode,
            name: getProviderName(plan.providerCode),
            logo: getProviderLogo(plan.providerCode),
            plansCount: 0,
          });
        }
        providerMap.get(plan.providerCode).plansCount++;
      });

      setProviders(Array.from(providerMap.values()));
    } catch {
      Alert.alert("Błąd", "Nie udało się pobrać platform");
    } finally {
      setLoading(false);
    }
  };

  const handleBillingDayConfirm = async () => {
    if (!selectedBillingDay) {
      Alert.alert("Wybierz dzień", "Zaznacz dzień rozliczeniowy");
      return;
    }

    setSavingBillingDay(true);
    try {
      await api.post("/api/billing/setup", { billingDay: selectedBillingDay });

      const freshUser = await storage.getUser();
      const updatedUser = { ...freshUser, billingDay: selectedBillingDay };
      await storage.setUser(updatedUser);
      setUser(updatedUser);

      setShowBillingSetup(false);
      setShowCardSetup(true);  // <-- zamiast loadProviders
    } catch {
      Alert.alert("Błąd", "Nie udało się zapisać dnia rozliczeniowego");
    } finally {
      setSavingBillingDay(false);
    }
  };

  // ── WIDOK: Billing Setup ──
  if (showBillingSetup) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ padding: 20, paddingTop: insets.top -15 }}>
  <View style={{ justifyContent: "center", marginBottom: 8 }}>

  <Pressable
    onPress={() => router.back()}
    style={{ position: "absolute", left: 0, paddingRight: 0 }}
  >
    <Text style={{ fontSize: 24 }}>←</Text>
  </Pressable>

  <Text
    style={{
      fontSize: 20,
      fontWeight: "600",
      textAlign: "center",
      paddingHorizontal: 20,
    }}
  >
    Wybierz dzień rozliczeniowy
  </Text>

</View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24, alignItems:"center",justifyContent:"center" }}>
            {BILLING_DAYS.map((day) => (
              <Pressable
                key={day}
                onPress={() => setSelectedBillingDay(day)}
                style={{
                  width: 79, height: 50, borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selectedBillingDay === day ? "#000" : "#ddd",
                  backgroundColor: selectedBillingDay === day ? "#000" : "#fff",
                  justifyContent: "center", alignItems: "center",
                }}
              >
                <Text style={{
                  fontSize: 20, fontWeight: "700",
                  color: selectedBillingDay === day ? "#fff" : "#000",
                }}>
                  {day}
                </Text>
              </Pressable>
            ))}
          </View>

          {selectedBillingDay && (
            <View style={{
              padding: 16, backgroundColor: "#f0f9ff", borderRadius: 12,
              marginBottom: 16, borderWidth: 1, borderColor: "#bae6fd",
            }}>
              <Text style={{ fontSize: 12, color: "#0369a1", lineHeight: 22 }}>
              <Text style={{ fontWeight: "700" }}>{selectedBillingDay}. każdego miesiąca</Text> zostanie pobrana jedna płatność za wszystkie aktywne platformy.
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleBillingDayConfirm}
            disabled={!selectedBillingDay || savingBillingDay}
            style={{
              paddingVertical: 16,
              backgroundColor: selectedBillingDay ? "#000" : "#ccc",
              borderRadius: 12,
              opacity: savingBillingDay ? 0.6 : 1,
            }}
          >
            {savingBillingDay ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 15 }}>
                Dalej
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── WIDOK: Dodaj kartę ──
  if (showCardSetup) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ padding: 20, paddingTop: insets.top -15 }}>
          <View style={{ justifyContent: "center", marginBottom: 8 }}>
          <Text style={{
      fontSize: 20,
      fontWeight: "600",
      textAlign: "center",
      paddingHorizontal: 20,
    }}>
            Dodaj kartę płatniczą
          </Text>
          </View>
          <Text style={{ fontSize: 12, color: "#666", lineHeight: 24, marginBottom: 8,textAlign: "center"  }}>
            Karta jest wymagana do automatycznych rozliczeń {" "}
            <Text style={{ fontWeight: "600", color: "#000" }}>
             {user?.billingDay} dniu każdego miesiąca.
            </Text>
          </Text>
          
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <CardField
            postalCodeEnabled={false}
            placeholders={{ number: "1234 5678 9012 3456" }}
            cardStyle={{
              backgroundColor: "#fff",
              textColor: "#000",
              borderColor: "#e0e0e0",
              borderWidth: 1,
              borderRadius: 12,
              fontSize: 15,
            }}
            style={{ width: "100%", height: 52, marginBottom: 24 }}
            onCardChange={(details) => setNewCardDetails(details)}
          />

          <Pressable
            onPress={async () => {
              if (!newCardDetails?.complete) {
                Alert.alert("Błąd", "Uzupełnij poprawnie dane karty.");
                return;
              }
              setSavingCard(true);
              try {
                const res = await api.post("/api/stripe/setup-intent");
                const { error, setupIntent } = await confirmSetupIntent(res.data.clientSecret, {
                  paymentMethodType: "Card",
                });
                if (error) {
                  Alert.alert("Błąd karty", error.message);
                  return;
                }
                if (setupIntent?.paymentMethodId) {
                  await api.post("/api/stripe/save-payment-method", {
                    paymentMethodId: setupIntent.paymentMethodId,
                  });
                }
                setShowCardSetup(false);
                await loadProviders();
              } catch (e: any) {
                Alert.alert("Błąd", e.response?.data?.error || "Nie udało się zapisać karty.");
              } finally {
                setSavingCard(false);
              }
            }}
            disabled={!newCardDetails?.complete || savingCard}
            style={{
              paddingVertical: 16,
              backgroundColor: newCardDetails?.complete ? "#000" : "#999",
              borderRadius: 12,
              opacity: savingCard ? 0.6 : 1,
              marginTop: 6,
            }}
          >
            {savingCard ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 15 }}>
                Dalej
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── WIDOK: Lista platform ──
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <View style={{ padding: 20, paddingTop: insets.top -15, backgroundColor: "#fff" }}>
        <View style={{ justifyContent: "center", marginBottom: 8 }}>
        <Pressable
    onPress={() => router.back()}
    style={{ position: "absolute", left: 0, paddingRight: 0 }}
  >
    <Text style={{ fontSize: 24 }}>←</Text>
  </Pressable>
        <Text style={{
      fontSize: 24,
      fontWeight: "600",
      textAlign: "center",
      paddingHorizontal: 20,
    }}>Wybierz platformę</Text>
        </View>
        {user?.billingDay && (
          <Text style={{ fontSize: 12, color: "#666", marginTop: 4,textAlign: "center" }}>
            Rozliczenie: <Text style={{ fontWeight: "700", color: "#000" }}>{user.billingDay}. każdego miesiąca</Text>
          </Text>
        )}
        
      </View>

      <FlatList
        data={providers}
        numColumns={2}
        contentContainerStyle={{ padding: 16 }}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/subscriptions-select-plan?provider=${item.code}` as any)}
            style={{
              flex: 1, margin: 6, padding: 16,
              backgroundColor: "#fff", borderRadius: 12,
              shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
              minHeight: 100, alignItems: "center", justifyContent: "center",
            }}
          >
            {item.logo && (
              <Image
                source={item.logo}
                style={{ width: 80, height: 80, marginBottom: 2, resizeMode: "contain" }}
              />
            )}
          </Pressable>
        )}
      />
    </View>
  );
}