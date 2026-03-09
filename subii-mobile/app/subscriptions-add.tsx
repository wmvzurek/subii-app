import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CardField, useStripe } from "@stripe/stripe-react-native";

import { plansApi, subscriptionsApi, api } from "../src/lib/api";
import { storage } from "../src/lib/storage";
import { getProviderLogo, getProviderName } from "../src/lib/provider-logos";

const BILLING_DAYS = [1, 4, 8, 12, 16, 20, 24, 28];

export default function SubscriptionsAdd() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { confirmSetupIntent } = useStripe();

  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showBillingSetup, setShowBillingSetup] = useState(false);
  const [selectedBillingDay, setSelectedBillingDay] = useState<number | null>(null);
  const [savingBillingDay, setSavingBillingDay] = useState(false);
  const [showCardSetup, setShowCardSetup] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [newCardDetails, setNewCardDetails] = useState<any>(null);

  const BG = "#f5f5f5";
  const WHITE = "#fff";
  const BLACK = "#252729";
  const MUTED = "#666";
  const BORDER = "#ddd";
  const CARD_BORDER = "#e0e0e0";
  const DISABLED = "#ccc";
  const DISABLED_DARK = "#999";
  const INFO_BG = "#f0f9ff";
  const INFO_BORDER = "#bae6fd";
  const INFO_TEXT = "#0369a1";

  const FONT_REGULAR = "Inter_400Regular";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";

  const loadProviders = useCallback(async () => {
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
  }, []);

  const initScreen = useCallback(async () => {
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

      if (!savedUser?.billingDay) {
        const res = await subscriptionsApi.getAll();
        const hasAny = (res?.subscriptions || []).length > 0;

        if (!hasAny) {
          setShowBillingSetup(true);
          setLoading(false);
          return;
        }
      }

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
  }, [loadProviders, router]);

  useEffect(() => {
    initScreen();
  }, [initScreen]);

  const handleBillingDayConfirm = useCallback(async () => {
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
      setShowCardSetup(true);
    } catch {
      Alert.alert("Błąd", "Nie udało się zapisać dnia rozliczeniowego");
    } finally {
      setSavingBillingDay(false);
    }
  }, [selectedBillingDay]);

  const handleSaveCard = useCallback(async () => {
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
  }, [confirmSetupIntent, loadProviders, newCardDetails?.complete]);

  if (showBillingSetup) {
    return (
      <View style={{ flex: 1, backgroundColor: WHITE }}>
        <View style={{ padding: 20, paddingTop: insets.top - 15 }}>
          <View style={{ justifyContent: "center", marginBottom: 8 }}>
            <Pressable
              onPress={() => router.back()}
              style={{ position: "absolute", left: 0, paddingRight: 0 }}
            >
              <Text
                style={{
                  fontSize: 24,
                  color: BLACK,
                  fontFamily: FONT_REGULAR,
                }}
              >
                ←
              </Text>
            </Pressable>

            <Text
              style={{
                fontSize: 20,
                color: BLACK,
                textAlign: "center",
                paddingHorizontal: 20,
                fontFamily: FONT_SEMI,
              }}
            >
              Wybierz dzień rozliczeniowy
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 24,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {BILLING_DAYS.map((day) => (
              <Pressable
                key={day}
                onPress={() => setSelectedBillingDay(day)}
                style={{
                  width: 79,
                  height: 50,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selectedBillingDay === day ? BLACK : BORDER,
                  backgroundColor: selectedBillingDay === day ? BLACK : WHITE,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    color: selectedBillingDay === day ? WHITE : BLACK,
                    fontFamily: FONT_BOLD,
                  }}
                >
                  {day}
                </Text>
              </Pressable>
            ))}
          </View>

          {selectedBillingDay && (
            <View
              style={{
                padding: 16,
                backgroundColor: INFO_BG,
                borderRadius: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: INFO_BORDER,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: INFO_TEXT,
                  lineHeight: 22,
                  fontFamily: FONT_REGULAR,
                }}
              >
                <Text style={{ fontFamily: FONT_BOLD }}>
                  {selectedBillingDay}. każdego miesiąca
                </Text>{" "}
                zostanie pobrana jedna płatność za wszystkie aktywne platformy.
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleBillingDayConfirm}
            disabled={!selectedBillingDay || savingBillingDay}
            style={{
              paddingVertical: 16,
              backgroundColor: selectedBillingDay ? BLACK : DISABLED,
              borderRadius: 12,
              opacity: savingBillingDay ? 0.6 : 1,
            }}
          >
            {savingBillingDay ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text
                style={{
                  color: WHITE,
                  textAlign: "center",
                  fontSize: 15,
                  fontFamily: FONT_BOLD,
                }}
              >
                Dalej
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (showCardSetup) {
    return (
      <View style={{ flex: 1, backgroundColor: WHITE }}>
        <View style={{ padding: 20, paddingTop: insets.top - 15 }}>
          <View style={{ justifyContent: "center", marginBottom: 8 }}>
            <Text
              style={{
                fontSize: 20,
                color: BLACK,
                textAlign: "center",
                paddingHorizontal: 20,
                fontFamily: FONT_SEMI,
              }}
            >
              Dodaj kartę płatniczą
            </Text>
          </View>

          <Text
            style={{
              fontSize: 12,
              color: MUTED,
              lineHeight: 24,
              marginBottom: 8,
              textAlign: "center",
              fontFamily: FONT_REGULAR,
            }}
          >
            Karta jest wymagana do automatycznych rozliczeń{" "}
            <Text style={{ color: BLACK, fontFamily: FONT_SEMI }}>
              {user?.billingDay} dniu każdego miesiąca.
            </Text>
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <CardField
            postalCodeEnabled={false}
            placeholders={{ number: "1234 5678 9012 3456" }}
            cardStyle={{
              backgroundColor: WHITE,
              textColor: BLACK,
              borderColor: CARD_BORDER,
              borderWidth: 1,
              borderRadius: 12,
              fontSize: 15,
            }}
            style={{ width: "100%", height: 52, marginBottom: 24 }}
            onCardChange={(details) => setNewCardDetails(details)}
          />

          <Pressable
            onPress={handleSaveCard}
            disabled={!newCardDetails?.complete || savingCard}
            style={{
              paddingVertical: 16,
              backgroundColor: newCardDetails?.complete ? BLACK : DISABLED_DARK,
              borderRadius: 12,
              opacity: savingCard ? 0.6 : 1,
              marginTop: 6,
            }}
          >
            {savingCard ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text
                style={{
                  color: WHITE,
                  textAlign: "center",
                  fontSize: 15,
                  fontFamily: FONT_BOLD,
                }}
              >
                Dalej
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    );
  }

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
          paddingTop: insets.top - 15,
          backgroundColor: WHITE,
        }}
      >
        <View style={{ justifyContent: "center", marginBottom: 8 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ position: "absolute", left: 0, paddingRight: 0 }}
          >
            <Text
              style={{
                fontSize: 24,
                color: BLACK,
                fontFamily: FONT_REGULAR,
              }}
            >
              ←
            </Text>
          </Pressable>

          <Text
            style={{
              fontSize: 24,
              color: BLACK,
              textAlign: "center",
              paddingHorizontal: 20,
              fontFamily: FONT_SEMI,
            }}
          >
            Wybierz platformę
          </Text>
        </View>

        {user?.billingDay && (
          <Text
            style={{
              fontSize: 12,
              color: MUTED,
              marginTop: 4,
              textAlign: "center",
              fontFamily: FONT_REGULAR,
            }}
          >
            Rozliczenie:{" "}
            <Text style={{ color: BLACK, fontFamily: FONT_BOLD }}>
              {user.billingDay}. każdego miesiąca
            </Text>
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
            onPress={() =>
              router.push(`/subscriptions-select-plan?provider=${item.code}` as any)
            }
            style={{
              flex: 1,
              margin: 6,
              padding: 16,
              backgroundColor: WHITE,
              borderRadius: 12,
              shadowColor: BLACK,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
              minHeight: 100,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item.logo && (
              <Image
                source={item.logo}
                style={{
                  width: 80,
                  height: 80,
                  marginBottom: 2,
                  resizeMode: "contain",
                }}
              />
            )}
          </Pressable>
        )}
      />
    </View>
  );
}