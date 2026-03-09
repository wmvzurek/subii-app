import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { plansApi, subscriptionsApi, api } from "../src/lib/api";
import {
  getProviderLogo,
  formatPlanName,
  getProviderDescription,
} from "../src/lib/provider-logos";
import { MaterialIcons } from "@expo/vector-icons";
import { storage } from "../src/lib/storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PaymentModal from "../src/components/PaymentModal";
import { getProviderName } from "../src/lib/provider-logos";
import { getNextBillingDateStr } from "../src/lib/billing";
import {
  useFonts,
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";

export default function SubscriptionsSelectPlan() {
  const router = useRouter();
  const { provider } = useLocalSearchParams<{ provider: string }>();
  const providerCode = String(provider || "").trim().toLowerCase();

  const prettyProvider = (code?: string) =>
    getProviderName(String(code || "").trim().toLowerCase());

  const [fontsLoaded] = useFonts({
    Inter_100Thin,
    Inter_200ExtraLight,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  const BG = "#f5f5f5";
  const WHITE = "#fff";
  const BLACK = "#252729";
  const MUTED = "#666";
  const SUBTLE = "#999";
  const LIGHT_BG = "#f0f0f0";
  const BORDER = "#eee";
  const BORDER_PLAN = "#ddd";
  const SHADOW = "#000";
  const AMBER = "#f59e0b";
  const BLUE = "#2563eb";
  const BLUE_BG = "rgba(59,130,246,0.12)";
  const BLUE_BORDER = "rgba(59,130,246,0.4)";
  const BLUE_PENDING_BORDER = "rgba(59,130,246,0.5)";
  const SUCCESS_BG = "rgba(134,239,172,0.2)";
  const SUCCESS_BORDER = "rgba(134,239,172,0.4)";
  const SUCCESS_ACTIVE_BORDER = "rgba(134,239,172,0.6)";
  const SUCCESS_TEXT = "#16a34a";
  const DANGER = "#dc2626";
  const DANGER_BG = "rgba(239,68,68,0.1)";
  const DANGER_BORDER = "rgba(239,68,68,0.4)";

  const FONT_REGULAR = "Inter_400Regular";
  const FONT_MEDIUM = "Inter_500Medium";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";
  const FONT_EXTRABOLD = "Inter_800ExtraBold";

  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [currentUserPlan, setCurrentUserPlan] = useState<any>(null);
  const [hasAnySubscription, setHasAnySubscription] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [renewalDay, setRenewalDay] = useState<number | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"monthly" | "yearly">("monthly");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!provider) return;
    const ref = { current: true };
    loadData(ref);
    return () => {
      ref.current = false;
    };
  }, [provider]);

  const loadData = async (ref: { current: boolean }) => {
    try {
      const [savedUser, meRes, plansRes, subsRes] = await Promise.all([
        storage.getUser(),
        api.get("/api/auth/me").catch(() => null),
        plansApi.getAll(),
        subscriptionsApi.getAll(),
      ]);

      const freshUser = meRes?.data?.user
        ? { ...savedUser, ...meRes.data.user }
        : savedUser;

      if (ref.current) setUser(freshUser);

      if (meRes?.data?.user) {
        await storage.setUser({ ...savedUser, ...meRes.data.user });
      }

      if (!ref.current) return;

      const filtered = (plansRes?.plans || []).filter(
        (p: any) =>
          String(p?.providerCode || "").trim().toLowerCase() === providerCode
      );
      setPlans(filtered);

      const allSubs = subsRes?.subscriptions || [];
      setHasAnySubscription(allSubs.length > 0);

      const userSub = allSubs.find(
        (s: any) =>
          String(s?.providerCode || "").trim().toLowerCase() ===
            providerCode &&
          (s?.status === "active" ||
            s?.status === "pending_change" ||
            s?.status === "pending_cancellation")
      );
      setCurrentUserPlan(userSub || null);
    } catch {
      Alert.alert("Błąd", "Nie udało się pobrać danych");
    } finally {
      if (ref.current) setLoading(false);
    }
  };

  const getRenewalMinusOne = (renewalDate?: string): string => {
    if (!renewalDate) return "—";
    const d = new Date(renewalDate);
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString("pl-PL");
  };

  const getRenewalDateStr = (renewalDate?: string): string => {
    if (!renewalDate) return "—";
    return new Date(renewalDate).toLocaleDateString("pl-PL");
  };

  const getUpgradeCalc = () => {
    if (!selectedPlan || !currentUserPlan)
      return { diff: 0, credit: 0, daysLeft: 0 };
    const oldPrice =
      currentUserPlan.priceOverridePLN ||
      currentUserPlan.plan?.pricePLN ||
      0;
    const newPrice = selectedPlan.pricePLN || 0;
    const today = new Date();
    const nextRenewal = currentUserPlan.nextRenewalDate
      ? new Date(currentUserPlan.nextRenewalDate)
      : new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          today.getDate()
        );
    const daysLeft = Math.max(
      1,
      Math.round(
        (nextRenewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
    );
    const diff =
      Math.round(((newPrice - oldPrice) / 30) * daysLeft * 100) / 100;
    const credit =
      Math.round((newPrice - Math.max(0, diff)) * 100) / 100;
    return {
      diff: Math.max(0, diff),
      credit: Math.max(0, credit),
      daysLeft,
    };
  };

  const handlePlanSelect = (plan: any) => {
    if (!currentUserPlan) {
      setSelectedPlan(plan);
      setRenewalDay(new Date().getDate());
      setShowAddOptions(true);
      return;
    }

    if (plan.id === currentUserPlan.planId && !currentUserPlan.pendingPlanId) {
      Alert.alert("Brak zmian", "Ten plan jest już aktywny.");
      return;
    }

    if (plan.id === currentUserPlan.pendingPlanId) {
      Alert.alert("Brak zmian", "Ten plan jest już zaplanowany jako następny.");
      return;
    }

    setSelectedPlan(plan);
    setShowChangePlan(true);
  };

  const handleAddNow = () => {
    if (!selectedPlan) return;
    setShowAddOptions(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    try {
      await subscriptionsApi.create({
        planId: selectedPlan!.id,
        paymentOption: "now",
      });
      Alert.alert(
        "Płatność potwierdzona",
        `Subskrypcja ${providerName} została aktywowana.`
      );
      router.back();
    } catch (e: any) {
      Alert.alert(
        "Coś poszło nie tak",
        e.response?.data?.error ||
          "Nie udało się aktywować subskrypcji."
      );
    }
  };

  const handleChangePlanConfirm = async () => {
    if (!selectedPlan || !currentUserPlan) return;
    setShowChangePlan(false);
    try {
      await subscriptionsApi.update(currentUserPlan.id, {
        planId: selectedPlan.id,
      });
      const ref = { current: true };
      await loadData(ref);
      router.back();
    } catch (e: any) {
      Alert.alert(
        "Coś poszło nie tak",
        e.response?.data?.error || "Nie udało się zmienić planu."
      );
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentUserPlan) return;
    setShowCancelConfirm(false);
    try {
      const res = await subscriptionsApi.delete(currentUserPlan.id);
      const until = res.activeUntil
        ? new Date(res.activeUntil).toLocaleDateString("pl-PL")
        : "—";
      Alert.alert(
        "Subskrypcja została anulowana",
        `${providerName} aktywny do ${until}.\nKolejna opłata nie zostanie naliczona.`
      );
      router.back();
    } catch (e: any) {
      Alert.alert(
        "Coś poszło nie tak",
        e.response?.data?.error ||
          "Nie udało się anulować subskrypcji."
      );
    }
  };

  const handleReactivateConfirm = async () => {
    if (!currentUserPlan) return;
    setShowReactivateConfirm(false);
    try {
      await subscriptionsApi.update(currentUserPlan.id, {
        status: "active",
        activeUntil: null,
        cancelledAt: null,
      });
      Alert.alert(
        "Subskrypcja została aktywowana",
        "Dostęp do platformy został przywrócony."
      );
      const ref = { current: true };
      await loadData(ref);
    } catch (e: any) {
      Alert.alert(
        "Nie udało się aktywować subskrypcji",
        e.response?.data?.error || "Spróbuj ponownie za chwilę."
      );
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={BLACK} />
      </View>
    );
  }

  const logo = getProviderLogo(providerCode);
  const monthlyPlans = plans.filter((p: any) => p.cycle === "monthly");
  const yearlyPlans = plans.filter((p: any) => p.cycle === "yearly");
  const visiblePlans = activeTab === "monthly" ? monthlyPlans : yearlyPlans;
  const hasYearlyPlans = yearlyPlans.length > 0;
  const providerName = prettyProvider(providerCode);
  const description = getProviderDescription(providerCode);
  const { diff: upgradeDiff, daysLeft } = getUpgradeCalc();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1, backgroundColor: BG }}>
        <View
          style={{
            padding: 20,
            paddingTop: insets.top - 15,
            backgroundColor: WHITE,
            borderBottomWidth: 1,
            borderBottomColor: BORDER,
          }}
        >
          <Pressable onPress={() => router.back()} style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 24, fontFamily: FONT_REGULAR, color: BLACK }}>
              ←
            </Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            {logo && (
              <Image
                source={logo}
                style={{ width: 60, height: 60, resizeMode: "contain" }}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontFamily: FONT_SEMI, color: BLACK }}>
                {providerName}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: MUTED,
                  fontFamily: FONT_REGULAR,
                  marginTop: 2,
                }}
              >
                {currentUserPlan ? "Zmień plan" : "Wybierz plan"} (
                {visiblePlans.length} dostępnych)
              </Text>
            </View>
            <Pressable
              onPress={() => setShowInfo(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: WHITE,
                justifyContent: "flex-start",
                alignItems: "center",
              }}
            >
              <MaterialIcons name="info-outline" size={24} color={MUTED} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {hasYearlyPlans && (
            <View
              style={{
                flexDirection: "row",
                backgroundColor: LIGHT_BG,
                borderRadius: 12,
                padding: 2,
                marginBottom: 4,
              }}
            >
              <Pressable
                onPress={() => setActiveTab("monthly")}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor:
                    activeTab === "monthly" ? WHITE : "transparent",
                  shadowColor:
                    activeTab === "monthly" ? SHADOW : "transparent",
                  shadowOpacity: activeTab === "monthly" ? 0.08 : 0,
                  shadowRadius: 4,
                  elevation: activeTab === "monthly" ? 2 : 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily:
                      activeTab === "monthly" ? FONT_BOLD : FONT_MEDIUM,
                    color: activeTab === "monthly" ? BLACK : MUTED,
                  }}
                >
                  Miesięczne
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("yearly")}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor:
                    activeTab === "yearly" ? WHITE : "transparent",
                  shadowColor:
                    activeTab === "yearly" ? SHADOW : "transparent",
                  shadowOpacity: activeTab === "yearly" ? 0.08 : 0,
                  shadowRadius: 4,
                  elevation: activeTab === "yearly" ? 2 : 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily:
                      activeTab === "yearly" ? FONT_BOLD : FONT_MEDIUM,
                    color: activeTab === "yearly" ? BLACK : MUTED,
                  }}
                >
                  Roczne
                </Text>
              </Pressable>
            </View>
          )}

          {visiblePlans.map((plan) => {
            const planId = plan?.id;
            const price = Number(plan?.pricePLN ?? 0);
            const screens = Number(plan?.screens ?? 0);
            const uhd = Boolean(plan?.uhd);
            const ads = Boolean(plan?.ads);
            const cycle = plan?.cycle === "yearly" ? "yearly" : "monthly";
            const isPendingCancellation =
              currentUserPlan?.status === "pending_cancellation";
            const isPendingChange =
              currentUserPlan?.status === "pending_change";
            const isCurrentPlan =
              currentUserPlan?.planId === planId &&
              !isPendingCancellation &&
              !isPendingChange;
            const isCancelledPlan =
              currentUserPlan?.planId === planId && isPendingCancellation;
            const isPendingPlan =
              currentUserPlan?.pendingPlanId === planId;
            const isSelected = selectedPlan?.id === planId;

            return (
              <Pressable
                key={String(planId)}
                onPress={() => handlePlanSelect(plan)}
                style={{
                  padding: 16,
                  borderWidth: 2,
                  borderColor: isCancelledPlan
                    ? DANGER_BORDER
                    : isCurrentPlan
                    ? SUCCESS_ACTIVE_BORDER
                    : isPendingPlan
                    ? BLUE_PENDING_BORDER
                    : isSelected
                    ? BLACK
                    : BORDER_PLAN,
                  borderRadius: 16,
                  backgroundColor: WHITE,
                  shadowColor: SHADOW,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  {logo && (
                    <Image
                      source={logo}
                      style={{ width: 50, height: 50, resizeMode: "contain" }}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    {isCurrentPlan && (
                      <View
                        style={{
                          alignSelf: "flex-start",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          backgroundColor: SUCCESS_BG,
                          borderRadius: 8,
                          marginBottom: 8,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          borderWidth: 1,
                          borderColor: SUCCESS_BORDER,
                        }}
                      >
                        <Text
                          style={{
                            color: SUCCESS_TEXT,
                            fontSize: 11,
                            fontFamily: FONT_BOLD,
                          }}
                        >
                          BIEŻĄCY PLAN
                        </Text>
                      </View>
                    )}
                    {isCancelledPlan && (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          backgroundColor: DANGER_BG,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: DANGER_BORDER,
                          alignSelf: "flex-start",
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontFamily: FONT_EXTRABOLD,
                            color: DANGER,
                          }}
                        >
                          ANULOWANA
                        </Text>
                      </View>
                    )}
                    {isPendingPlan && (
                      <View
                        style={{
                          alignSelf: "flex-start",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          backgroundColor: BLUE_BG,
                          borderRadius: 8,
                          marginBottom: 8,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          borderWidth: 1,
                          borderColor: BLUE_BORDER,
                        }}
                      >
                        <Text
                          style={{
                            color: BLUE,
                            fontSize: 11,
                            fontFamily: FONT_BOLD,
                          }}
                        >
                          W TRAKCIE ZMIANY
                        </Text>
                      </View>
                    )}
                    <Text
                      style={{
                        fontSize: 18,
                        fontFamily: FONT_BOLD,
                        marginBottom: 8,
                        color: BLACK,
                      }}
                    >
                      {formatPlanName(providerCode, plan?.planName ?? "")}
                    </Text>
                    <Text
                      style={{
                        fontSize: 24,
                        fontFamily: FONT_EXTRABOLD,
                        color: BLACK,
                        marginBottom: 12,
                      }}
                    >
                      {price.toFixed(2)} zł
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: FONT_REGULAR,
                          color: MUTED,
                        }}
                      >
                        {cycle === "yearly" ? " / rok" : " / miesiąc"}
                      </Text>
                    </Text>
                    <View style={{ gap: 6 }}>
                      <PlanFeature
                        icon="tv"
                        text={`${screens} ${
                          screens === 1 ? "ekran" : "ekrany"
                        }`}
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
                  {isSelected && !isCurrentPlan && (
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: BLACK,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: WHITE,
                          fontSize: 16,
                          fontFamily: FONT_REGULAR,
                        }}
                      >
                        ✓
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}

          {currentUserPlan &&
            currentUserPlan.status !== "pending_cancellation" && (
              <Pressable
                onPress={() => setShowCancelConfirm(true)}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  backgroundColor: BLACK,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: WHITE,
                    fontFamily: FONT_BOLD,
                    fontSize: 15,
                  }}
                >
                  Anuluj subskrypcję
                </Text>
              </Pressable>
            )}
        </ScrollView>

        <Modal
          visible={showAddOptions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddOptions(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                backgroundColor: WHITE,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: FONT_BOLD,
                  color: BLACK,
                  marginBottom: 6,
                }}
              >
                Potwierdź aktywację
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: MUTED,
                  marginBottom: 16,
                  fontFamily: FONT_REGULAR,
                }}
              >
                {providerName} · {selectedPlan?.pricePLN?.toFixed(2)} zł
                {selectedPlan?.cycle === "yearly" ? "/rok" : "/mies"}
              </Text>

              <View
                style={{
                  padding: 16,
                  backgroundColor: BG,
                  borderRadius: 10,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: BORDER,
                  gap: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: MUTED,
                    lineHeight: 18,
                    fontFamily: FONT_REGULAR,
                  }}
                >
                  Nowy plan zostanie aktywowany natychmiast. Dokonujesz
                  jednorazowej opłaty{" "}
                  <Text style={{ color: MUTED, fontFamily: FONT_BOLD }}>
                    {selectedPlan?.pricePLN?.toFixed(2)} zł
                  </Text>
                  . Rozliczenie tej usługi w Subii rozpocznie się od kolejnego
                  okresu.
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 6,
                  }}
                >
                  <MaterialIcons name="lock" size={12} color={MUTED} />
                  <Text
                    style={{
                      color: MUTED,
                      fontSize: 11,
                      fontFamily: FONT_REGULAR,
                    }}
                  >
                    Płatność obsługiwana przez Stripe · SSL
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleAddNow}
                style={{
                  paddingVertical: 16,
                  backgroundColor: BLACK,
                  borderRadius: 12,
                  marginBottom: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <MaterialIcons name="bolt" size={18} color={WHITE} />
                  <Text
                    style={{
                      color: WHITE,
                      textAlign: "center",
                      fontFamily: FONT_BOLD,
                      fontSize: 15,
                    }}
                  >
                    Zapłać teraz
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowAddOptions(false);
                  setSelectedPlan(null);
                  setRenewalDay(null);
                }}
                style={{
                  padding: 14,
                  backgroundColor: LIGHT_BG,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT_BOLD,
                    color: "#333",
                    fontSize: 14,
                  }}
                >
                  Anuluj
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showChangePlan}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowChangePlan(false);
            setSelectedPlan(null);
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                backgroundColor: WHITE,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
              }}
            >
              {(() => {
                if (!selectedPlan || !currentUserPlan) return null;

                const oldPrice =
                  currentUserPlan.priceOverridePLN ||
                  currentUserPlan.plan?.pricePLN ||
                  0;
                const newPrice = selectedPlan.pricePLN || 0;
                const isUpgrade = newPrice > oldPrice;
                const oldPlan = currentUserPlan.plan;

                const changes: { text: string; positive: boolean }[] = [];
                const oldScreens = oldPlan?.screens ?? 0;
                const newScreens = selectedPlan?.screens ?? 0;
                const oldUhd = oldPlan?.uhd ?? false;
                const newUhd = selectedPlan?.uhd ?? false;
                const oldAds = oldPlan?.ads ?? false;
                const newAds = selectedPlan?.ads ?? false;

                if (newScreens !== oldScreens) {
                  changes.push({
                    text: `Ekrany: ${oldScreens} → ${newScreens}`,
                    positive: newScreens > oldScreens,
                  });
                }
                if (newUhd !== oldUhd) {
                  changes.push({
                    text: newUhd ? "Jakość 4K Ultra HD" : "Jakość HD (bez 4K)",
                    positive: newUhd,
                  });
                }
                if (newAds !== oldAds) {
                  changes.push({
                    text: newAds ? "Reklamy włączone" : "Bez reklam",
                    positive: !newAds,
                  });
                }

                const billingDateStr = getNextBillingDateStr(
                  user?.billingDay,
                  currentUserPlan?.nextRenewalDate
                );
                const currentPlanUntilStr = getRenewalMinusOne(
                  currentUserPlan?.nextRenewalDate
                );
                const newPlanStartStr = getRenewalDateStr(
                  currentUserPlan?.nextRenewalDate
                );

                return (
                  <>
                    <Text
                      style={{
                        fontSize: 20,
                        fontFamily: FONT_BOLD,
                        color: BLACK,
                        marginBottom: 6,
                      }}
                    >
                      Zmiana planu
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: MUTED,
                        marginBottom: 16,
                        fontFamily: FONT_REGULAR,
                      }}
                    >
                      {formatPlanName(providerCode, oldPlan?.planName ?? "")} (
                      {oldPrice.toFixed(2)} zł){"  →  "}
                      {formatPlanName(
                        providerCode,
                        selectedPlan?.planName ?? ""
                      )}{" "}
                      ({newPrice.toFixed(2)} zł)
                    </Text>

                    {changes.length > 0 && (
                      <View
                        style={{
                          padding: 16,
                          backgroundColor: WHITE,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: BORDER,
                          marginBottom: 12,
                          gap: 10,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontFamily: FONT_BOLD,
                            color: MUTED,
                            marginBottom: 2,
                          }}
                        >
                          Co się zmienia:
                        </Text>
                        {changes.map((c, i) => (
                          <View
                            key={i}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                fontFamily: FONT_REGULAR,
                                color: MUTED,
                              }}
                            >
                              {c.positive ? "✓" : "✕"}
                            </Text>
                            <Text
                              style={{
                                fontSize: 13,
                                color: MUTED,
                                fontFamily: FONT_REGULAR,
                              }}
                            >
                              {c.text}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View
                      style={{
                        padding: 12,
                        backgroundColor: BG,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: BORDER,
                        marginBottom: 20,
                        gap: 10,
                      }}
                    >
                      {isUpgrade ? (
                        <>
                          <Text
                            style={{
                              fontSize: 12,
                              color: MUTED,
                              lineHeight: 18,
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            Po zmianie planu korzystasz z nowej wersji
                            natychmiast.
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: MUTED,
                              lineHeight: 18,
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            Najbliższa płatność w Subii (
                            <Text style={{ fontFamily: FONT_BOLD }}>
                              {billingDateStr}
                            </Text>
                            ) będzie w wysokości{" "}
                            <Text style={{ fontFamily: FONT_BOLD }}>
                              {newPrice.toFixed(2)} zł
                            </Text>{" "}
                            oraz zostanie powiększona o proporcjonalny koszt
                            podwyższenia za pozostałe dni.
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: MUTED,
                              lineHeight: 18,
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            Każda kolejna płatność będzie naliczana według nowej
                            ceny.
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text
                            style={{
                              fontSize: 12,
                              color: MUTED,
                              lineHeight: 18,
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            Obecny plan obowiązuje do{" "}
                            <Text style={{ fontFamily: FONT_BOLD }}>
                              {currentPlanUntilStr}
                            </Text>
                            .
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: MUTED,
                              lineHeight: 18,
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            Nowy plan{" "}
                            <Text style={{ fontFamily: FONT_BOLD }}>
                              {formatPlanName(
                                providerCode,
                                selectedPlan?.planName ?? ""
                              )}
                            </Text>{" "}
                            zacznie obowiązywać od{" "}
                            <Text style={{ fontFamily: FONT_BOLD }}>
                              {currentPlanUntilStr}
                            </Text>
                            .
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: MUTED,
                              lineHeight: 18,
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            Od tego momentu opłata w Subii będzie naliczana
                            według nowej ceny{" "}
                            <Text style={{ fontFamily: FONT_BOLD }}>
                              {newPrice.toFixed(2)} zł / mies
                            </Text>
                            .
                          </Text>
                        </>
                      )}
                    </View>

                    <Pressable
                      onPress={handleChangePlanConfirm}
                      style={{
                        paddingVertical: 16,
                        backgroundColor: BLACK,
                        borderRadius: 12,
                        marginBottom: 12,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: WHITE,
                          textAlign: "center",
                          fontFamily: FONT_BOLD,
                          fontSize: 15,
                        }}
                      >
                        Potwierdź zmianę planu
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setShowChangePlan(false);
                        setSelectedPlan(null);
                      }}
                      style={{
                        padding: 14,
                        backgroundColor: LIGHT_BG,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: FONT_BOLD,
                          color: "#333",
                          fontSize: 14,
                        }}
                      >
                        Anuluj
                      </Text>
                    </Pressable>
                  </>
                );
              })()}
            </View>
          </View>
        </Modal>

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
                backgroundColor: WHITE,
                borderRadius: 20,
                padding: 24,
                width: "100%",
                maxWidth: 400,
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
                    style={{ width: 40, height: 40, resizeMode: "contain" }}
                  />
                )}
                <Text
                  style={{
                    fontSize: 20,
                    fontFamily: FONT_BOLD,
                    color: BLACK,
                    flex: 1,
                  }}
                >
                  {providerName}
                </Text>
                <Pressable onPress={() => setShowInfo(false)}>
                  <MaterialIcons name="close" size={24} color={MUTED} />
                </Pressable>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  color: MUTED,
                  lineHeight: 22,
                  fontFamily: FONT_REGULAR,
                }}
              >
                {description}
              </Text>
              <Pressable
                onPress={() => setShowInfo(false)}
                style={{
                  marginTop: 20,
                  paddingVertical: 16,
                  backgroundColor: BLACK,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: WHITE,
                    textAlign: "center",
                    fontFamily: FONT_BOLD,
                    fontSize: 15,
                  }}
                >
                  Zamknij
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={showCancelConfirm}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCancelConfirm(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                backgroundColor: WHITE,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: FONT_BOLD,
                  color: BLACK,
                  marginBottom: 6,
                }}
              >
                Czy na pewno chcesz zrezygnować z {providerName}?
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: MUTED,
                  marginBottom: 16,
                  fontFamily: FONT_REGULAR,
                }}
              >
                {currentUserPlan?.plan?.planName} ·{" "}
                {(
                  currentUserPlan?.priceOverridePLN ||
                  currentUserPlan?.plan?.pricePLN ||
                  0
                ).toFixed(2)}{" "}
                zł/mies
              </Text>

              <View
                style={{
                  padding: 16,
                  backgroundColor: BG,
                  borderRadius: 10,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: BORDER,
                  gap: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: MUTED,
                    lineHeight: 18,
                    fontFamily: FONT_REGULAR,
                  }}
                >
                  Dostęp pozostanie aktywny do{" "}
                  <Text style={{ fontFamily: FONT_EXTRABOLD }}>
                    {getRenewalMinusOne(currentUserPlan?.nextRenewalDate)}{" "}
                  </Text>
                  .
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: MUTED,
                    lineHeight: 18,
                    fontFamily: FONT_REGULAR,
                  }}
                >
                  Po tej dacie subskrypcja wygaśnie automatycznie.
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: MUTED,
                    lineHeight: 18,
                    fontFamily: FONT_REGULAR,
                  }}
                >
                  Opłata za kolejny okres nie zostanie pobrana.
                </Text>
              </View>

              <Pressable
                onPress={handleCancelSubscription}
                style={{
                  paddingVertical: 16,
                  backgroundColor: BLACK,
                  borderRadius: 12,
                  marginBottom: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: WHITE,
                    textAlign: "center",
                    fontFamily: FONT_BOLD,
                    fontSize: 15,
                  }}
                >
                  Potwierdź rezygnację
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowCancelConfirm(false)}
                style={{
                  padding: 14,
                  backgroundColor: LIGHT_BG,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT_BOLD,
                    color: "#333",
                    fontSize: 14,
                  }}
                >
                  Anuluj
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <PaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          amountPLN={selectedPlan?.pricePLN ?? 0}
          description={providerName}
        />
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
  const FONT_REGULAR = "Inter_400Regular";
  const FONT_SEMI = "Inter_600SemiBold";
  const AMBER = "#f59e0b";
  const MUTED = "#666";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <MaterialIcons
        name={icon as any}
        size={18}
        color={warning ? AMBER : MUTED}
      />
      <Text
        style={{
          fontSize: 13,
          color: warning ? AMBER : MUTED,
          fontFamily: warning ? FONT_SEMI : FONT_REGULAR,
        }}
      >
        {text}
      </Text>
    </View>
  );
}