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

const BILLING_DAYS = [1, 5, 10, 15, 20, 25, 28];

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
        <View style={{ padding: 20, paddingTop: insets.top + 16}}>
          <Pressable onPress={() => router.back()} style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 28 }}>←</Text>
          </Pressable>
          <Text style={{ fontSize: 28, fontWeight: "900", marginBottom: 8 }}>
            Wybierz dzień rozliczeniowy
          </Text>
          <Text style={{ fontSize: 15, color: "#666", lineHeight: 24, marginBottom: 32 }}>
            Tego dnia każdego miesiąca zostanie pobrana jedna zbiorcza płatność za wszystkie Twoje subskrypcje streamingowe.
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <Text style={{ fontSize: 13, color: "#999", fontWeight: "600", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
            Wybierz dzień
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
            {BILLING_DAYS.map((day) => (
              <Pressable
                key={day}
                onPress={() => setSelectedBillingDay(day)}
                style={{
                  width: 72, height: 72, borderRadius: 16,
                  borderWidth: 2,
                  borderColor: selectedBillingDay === day ? "#000" : "#ddd",
                  backgroundColor: selectedBillingDay === day ? "#000" : "#fff",
                  justifyContent: "center", alignItems: "center",
                }}
              >
                <Text style={{
                  fontSize: 22, fontWeight: "800",
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
              <Text style={{ fontSize: 14, color: "#0369a1", lineHeight: 22 }}>
                💡 <Text style={{ fontWeight: "700" }}>{selectedBillingDay}. każdego miesiąca</Text> zostanie pobrana jedna płatność za wszystkie aktywne platformy, których odnowienie wypada w tym okresie.
              </Text>
            </View>
          )}

          <View style={{
            padding: 16, backgroundColor: "#fffbeb", borderRadius: 12,
            marginBottom: 32, borderWidth: 1, borderColor: "#fde68a",
          }}>
            <Text style={{ fontSize: 13, color: "#92400e", lineHeight: 20 }}>
              💡 <Text style={{ fontWeight: "700" }}>Wskazówka:</Text> Wybierz dzień po wypłacie – np. jeśli dostajesz wynagrodzenie 10., ustaw rozliczenie na 11. lub 12.
            </Text>
          </View>

          <Pressable
            onPress={handleBillingDayConfirm}
            disabled={!selectedBillingDay || savingBillingDay}
            style={{
              padding: 18,
              backgroundColor: selectedBillingDay ? "#000" : "#ccc",
              borderRadius: 14,
              opacity: savingBillingDay ? 0.6 : 1,
            }}
          >
            {savingBillingDay ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 16 }}>
                Zatwierdź i wybierz platformę →
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
        <View style={{ padding: 20, paddingTop: insets.top + 16 }}>
          <Pressable onPress={() => router.back()} style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 28 }}>←</Text>
          </Pressable>
          <Text style={{ fontSize: 28, fontWeight: "900", marginBottom: 8 }}>
            Dodaj kartę płatniczą
          </Text>
          <Text style={{ fontSize: 15, color: "#666", lineHeight: 24, marginBottom: 32 }}>
            Karta jest wymagana do automatycznych rozliczeń w dniu{" "}
            <Text style={{ fontWeight: "700", color: "#000" }}>
              {user?.billingDay}. każdego miesiąca
            </Text>
            .
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
              borderRadius: 10,
              fontSize: 15,
            }}
            style={{ width: "100%", height: 52, marginBottom: 12 }}
            onCardChange={(details) => setNewCardDetails(details)}
          />

          <Text style={{ fontSize: 11, color: "#999", textAlign: "center", marginBottom: 24 }}>
            🔒 Dane karty są szyfrowane przez Stripe
          </Text>

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
              padding: 18,
              backgroundColor: newCardDetails?.complete ? "#000" : "#ccc",
              borderRadius: 14,
              opacity: savingCard ? 0.6 : 1,
            }}
          >
            {savingCard ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 16 }}>
                Zapisz kartę i kontynuuj →
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
      <View style={{ padding: 20, paddingTop: insets.top + 16, backgroundColor: "#fff" }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 28 }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 28, fontWeight: "800" }}>Wybierz platformę</Text>
        {user?.billingDay && (
          <Text style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
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
              flex: 1, margin: 8, padding: 20,
              backgroundColor: "#fff", borderRadius: 16,
              shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
              minHeight: 160, alignItems: "center", justifyContent: "center",
            }}
          >
            {item.logo && (
              <Image
                source={item.logo}
                style={{ width: 80, height: 80, marginBottom: 12, resizeMode: "contain" }}
              />
            )}
            <Text style={{ fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 4 }}>
              {item.name}
            </Text>
            <Text style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
              {item.plansCount} {item.plansCount === 1 ? "plan" : "planów"}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}