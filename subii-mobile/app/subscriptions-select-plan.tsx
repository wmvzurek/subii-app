import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { plansApi, subscriptionsApi } from "../src/lib/api";
import {
  getProviderLogo,
  formatPlanName,
  getProviderDescription,
} from "../src/lib/provider-logos";
import { MaterialIcons } from "@expo/vector-icons";

export default function SubscriptionsSelectPlan() {
  const router = useRouter();
  const { provider } = useLocalSearchParams<{ provider: string }>();

  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [nextDueDate, setNextDueDate] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [currentUserPlan, setCurrentUserPlan] = useState<any>(null);

  const loadPlans = useCallback(async (isMountedRef: { current: boolean }) => {
    try {
      const res = await plansApi.getAll();
      const filtered = (res?.plans || []).filter(
        (p: any) => p?.providerCode === provider
      );
      if (isMountedRef.current) setPlans(filtered);
    } catch (error) {
      if (isMountedRef.current) {
        Alert.alert("Błąd", "Nie udało się pobrać planów");
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [provider]);

  const loadUserSubscription = useCallback(async (isMountedRef: { current: boolean }) => {
    try {
      const res = await subscriptionsApi.getAll();
      const userSub = (res?.subscriptions || []).find(
        (s: any) =>
          s?.providerCode === provider &&
          (s?.status === "active" || s?.status === "pending")
      );

      if (isMountedRef.current) setCurrentUserPlan(userSub || null);

      console.log(
        "📊 Current user plan:",
        userSub?.status,
        userSub?.plan?.planName
      );
    } catch (error) {
      console.log("❌ Nie udało się pobrać subskrypcji użytkownika", error);
      if (isMountedRef.current) setCurrentUserPlan(null);
    }
  }, [provider]);

  useEffect(() => {
    // provider czasem potrafi być undefined przez ułamek sekundy
    if (!provider) return;

    const isMountedRef = { current: true };

    setLoading(true);
    loadPlans(isMountedRef);
    loadUserSubscription(isMountedRef);

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setNextDueDate(nextMonth.toISOString().split("T")[0]);

    return () => {
      isMountedRef.current = false;
    };
  }, [provider, loadPlans, loadUserSubscription]);

  const handleAdd = async () => {
    if (!selectedPlan) {
      Alert.alert("Błąd", "Wybierz plan");
      return;
    }

    try {
      await subscriptionsApi.create({
        planId: selectedPlan.id,
        nextDueDate,
      });
      Alert.alert("Sukces! 🎉", "Subskrypcja została dodana");
      router.back();
    } catch (error: any) {
      Alert.alert("Błąd", error.response?.data?.error || "Nie udało się dodać");
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlan || !currentUserPlan) {
      Alert.alert("Błąd", "Wybierz nowy plan");
      return;
    }

    if (selectedPlan.id === currentUserPlan.planId) {
      Alert.alert("Info", "To jest Twój obecny plan");
      return;
    }

    const currentPlanName = currentUserPlan?.plan?.planName ?? "obecny plan";
    const newPlanName = selectedPlan?.planName ?? "nowy plan";

    Alert.alert(
      "Zmień plan",
      `Czy chcesz zmienić plan z "${currentPlanName}" na "${newPlanName}"?`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Zmień",
          onPress: async () => {
            try {
              await subscriptionsApi.update(currentUserPlan.id, {
                planId: selectedPlan.id,
              });
              Alert.alert("Sukces! 🎉", "Plan został zmieniony");
              router.back();
            } catch (error: any) {
              Alert.alert(
                "Błąd",
                error.response?.data?.error || "Nie udało się zmienić planu"
              );
            }
          },
        },
      ]
    );
  };

  const getProviderName = (code: string): string => {
    const names: Record<string, string> = {
      netflix: "Netflix",
      disney_plus: "Disney+",
      prime_video: "Prime Video",
      hbo_max: "Max",
      apple_tv: "Apple TV+",
    };
    return names[code] || code;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const logo = getProviderLogo(provider);
  const providerName = getProviderName(provider);
  const description = getProviderDescription(provider);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
        {/* Header z logo providera */}
        <View
          style={{
            padding: 20,
            paddingTop: 60,
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
          }}
        >
          <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 28 }}>←</Text>
          </Pressable>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            {logo && (
              <Image
                source={logo}
                style={{
                  width: 60,
                  height: 60,
                  resizeMode: "contain",
                }}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: "800" }}>
                {providerName}
              </Text>
              <Text style={{ fontSize: 14, color: "#666", marginTop: 2 }}>
                {currentUserPlan ? "Zmień plan" : "Wybierz plan"} ({plans.length}{" "}
                dostępnych)
              </Text>
            </View>

            {/* Przycisk Info */}
            <Pressable
              onPress={() => setShowInfo(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#f0f0f0",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialIcons name="info-outline" size={20} color="#000" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Lista planów */}
          {plans.map((plan) => {
            // Bezpieczne wartości (żeby nic nie wywaliło)
            const planId = plan?.id;
            const planName = plan?.planName ?? "";
            const screens = Number(plan?.screens ?? 0);
            const uhd = Boolean(plan?.uhd);
            const ads = Boolean(plan?.ads);
            const cycle = plan?.cycle === "yearly" ? "yearly" : "monthly";
            const price = Number(plan?.pricePLN ?? 0); // <- to naprawia crashe z toFixed

            const isCurrentPlan = currentUserPlan?.planId === planId;
            const isSelected = selectedPlan?.id === planId;
            const isPending = currentUserPlan?.status === "pending";

            return (
              <Pressable
                key={String(planId)}
                onPress={() => setSelectedPlan(plan)}
                style={{
                  padding: 16,
                  borderWidth: 2,
                  borderColor: isCurrentPlan
                    ? isPending
                      ? "#fbbf24"
                      : "rgba(134, 239, 172, 0.4)"
                    : isSelected
                    ? "#000"
                    : "#ddd",
                  borderRadius: 16,
                  backgroundColor: "#fff",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isCurrentPlan ? 0.15 : 0.05,
                  shadowRadius: isCurrentPlan ? 4 : 2,
                  elevation: isCurrentPlan ? 4 : 2,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  {/* Logo po lewej */}
                  {logo && (
                    <Image
                      source={logo}
                      style={{
                        width: 50,
                        height: 50,
                        resizeMode: "contain",
                        opacity: isCurrentPlan ? 1 : 0.8,
                      }}
                    />
                  )}

                  <View style={{ flex: 1 }}>
                    {/* Badge - OCZEKUJE lub TWÓJ PLAN */}
                    {isCurrentPlan && (
                      <View
                        style={{
                          alignSelf: "flex-start",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          backgroundColor: isPending
                            ? "rgba(251, 191, 36, 0.2)"
                            : "rgba(134, 239, 172, 0.2)",
                          borderRadius: 8,
                          marginBottom: 8,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          borderWidth: 1,
                          borderColor: isPending
                            ? "rgba(251, 191, 36, 0.4)"
                            : "rgba(134, 239, 172, 0.4)",
                        }}
                      >
                        <MaterialIcons
                          name={isPending ? "schedule" : "check-circle"}
                          size={14}
                          color={isPending ? "#d97706" : "#16a34a"}
                        />
                        <Text
                          style={{
                            color: isPending ? "#d97706" : "#16a34a",
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {isPending ? "Oczekuje" : "Twój plan"}
                        </Text>
                      </View>
                    )}

                    {/* Nazwa planu */}
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        marginBottom: 8,
                        color: "#000",
                      }}
                    >
                      {formatPlanName(provider, planName)}
                    </Text>

                    {/* Cena */}
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "800",
                        color: "#000",
                        marginBottom: 12,
                      }}
                    >
                      {price.toFixed(2)} zł
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "400",
                          color: "#666",
                        }}
                      >
                        {cycle === "yearly" ? " / rok" : " / miesiąc"}
                      </Text>
                    </Text>

                    {/* Parametry planu */}
                    <View style={{ gap: 6 }}>
                      <PlanFeature
                        icon="tv"
                        text={`${screens} ${screens === 1 ? "ekran" : "ekrany"}`}
                      />
                      <PlanFeature
                        icon="4k"
                        text={uhd ? "Jakość 4K Ultra HD" : "Jakość HD"}
                      />
                      <PlanFeature
                        icon={ads ? "new-releases" : "block"}
                        text={ads ? "Z reklamami" : "Bez reklam"}
                        warning={ads}
                      />
                    </View>
                  </View>

                  {/* Checkmark jeśli wybrany (ale nie obecny plan) */}
                  {isSelected && !isCurrentPlan && (
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: "#000",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 16 }}>✓</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}

          {/* Wybór daty płatności (tylko dla nowych subskrypcji) */}
          {selectedPlan && !currentUserPlan && (
            <View
              style={{
                marginTop: 16,
                padding: 20,
                backgroundColor: "#fff",
                borderRadius: 16,
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700" }}>
                Data następnej płatności
              </Text>

              <TextInput
                value={nextDueDate}
                onChangeText={setNextDueDate}
                placeholder="YYYY-MM-DD"
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  backgroundColor: "#f9f9f9",
                }}
              />

              <Text style={{ fontSize: 12, color: "#666" }}>
                💡 Wskazówka: Ustaw datę na dzień odnowienia subskrypcji
              </Text>

              <Pressable
                onPress={handleAdd}
                style={{
                  padding: 18,
                  backgroundColor: "#000",
                  borderRadius: 12,
                  marginTop: 8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  ✅ Dodaj subskrypcję
                </Text>
              </Pressable>
            </View>
          )}

          {/* Przycisk zmiany planu (dla istniejących subskrypcji) */}
          {selectedPlan &&
            currentUserPlan &&
            selectedPlan?.id !== currentUserPlan?.planId && (
              <View
                style={{
                  marginTop: 16,
                  padding: 20,
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700" }}>
                  Zmień plan
                </Text>

                <Text style={{ fontSize: 14, color: "#666" }}>
                  Przejdziesz z planu "
                  {currentUserPlan?.plan?.planName ?? "obecny plan"}" na "
                  {selectedPlan?.planName ?? "nowy plan"}"
                </Text>

                <Pressable
                  onPress={handleChangePlan}
                  style={{
                    padding: 18,
                    backgroundColor: "#16a34a",
                    borderRadius: 12,
                    marginTop: 8,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      textAlign: "center",
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    🔄 Zmień na ten plan
                  </Text>
                </Pressable>
              </View>
            )}
        </ScrollView>

        {/* Modal z informacją o platformie */}
        <Modal
          visible={showInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInfo(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
            onPress={() => setShowInfo(false)}
          >
            <Pressable
              style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 24,
                width: "100%",
                maxWidth: 400,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {logo && (
                  <Image
                    source={logo}
                    style={{
                      width: 40,
                      height: 40,
                      resizeMode: "contain",
                    }}
                  />
                )}
                <Text style={{ fontSize: 20, fontWeight: "800", flex: 1 }}>
                  {providerName}
                </Text>
                <Pressable onPress={() => setShowInfo(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </Pressable>
              </View>

              <Text style={{ fontSize: 14, color: "#666", lineHeight: 22 }}>
                {description}
              </Text>

              <Pressable
                onPress={() => setShowInfo(false)}
                style={{
                  marginTop: 20,
                  padding: 14,
                  backgroundColor: "#f0f0f0",
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "600", color: "#000" }}>
                  Zamknij
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

function PlanFeature({
  icon,
  text,
  warning,
}: {
  icon: string;
  text: string;
  warning?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <MaterialIcons
        name={icon as any}
        size={18}
        color={warning ? "#f59e0b" : "#666"}
      />
      <Text
        style={{
          fontSize: 13,
          color: warning ? "#f59e0b" : "#666",
          fontWeight: warning ? "600" : "400",
        }}
      >
        {text}
      </Text>
    </View>
  );
}
