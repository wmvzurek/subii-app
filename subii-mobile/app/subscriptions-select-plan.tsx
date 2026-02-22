//subscriptions-select-plan.tsx

import { useState, useEffect } from "react";
import {
  View, Text, Pressable, Alert, ActivityIndicator, Image,
  ScrollView, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { plansApi, subscriptionsApi, api } from "../src/lib/api";
import { getProviderLogo, formatPlanName, getProviderDescription } from "../src/lib/provider-logos";
import { MaterialIcons } from "@expo/vector-icons";
import { storage } from "../src/lib/storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SubscriptionsSelectPlan() {
  const router = useRouter();
  const { provider } = useLocalSearchParams<{ provider: string }>();

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
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!provider) return;
    const ref = { current: true };
    loadData(ref);
    return () => { ref.current = false; };
  }, [provider]);

 const loadData = async (ref: { current: boolean }) => {
  try {
    // Pobierz świeże dane usera z API (nie tylko z storage)
    const [savedUser, meRes, plansRes, subsRes] = await Promise.all([
      storage.getUser(),
      api.get("/api/auth/me").catch(() => null),
      plansApi.getAll(),
      subscriptionsApi.getAll(),
    ]);

    // Połącz dane z storage z świeżymi z API
    const freshUser = meRes?.data?.user
      ? { ...savedUser, ...meRes.data.user }
      : savedUser;

    if (ref.current) setUser(freshUser);

    // Zaktualizuj storage żeby był spójny
    if (meRes?.data?.user) {
      await storage.setUser({ ...savedUser, ...meRes.data.user });
    }

    if (!ref.current) return;

    const filtered = (plansRes?.plans || []).filter(
      (p: any) => p?.providerCode === provider
    );
    setPlans(filtered);

    const allSubs = subsRes?.subscriptions || [];
    setHasAnySubscription(allSubs.length > 0);

    const userSub = allSubs.find(
  (s: any) => s?.providerCode === provider &&
  (s?.status === "active" || s?.status === "pending_change" || s?.status === "pending_cancellation")
);
    setCurrentUserPlan(userSub || null);
  } catch {
    Alert.alert("Błąd", "Nie udało się pobrać danych");
  } finally {
    if (ref.current) setLoading(false);
  }
};

  // ── Helpers ──

  const getProviderName = (code: string): string => {
    const names: Record<string, string> = {
      netflix: "Netflix", disney_plus: "Disney+",
      prime_video: "Prime Video", hbo_max: "HBO Max", apple_tv: "Apple TV+",
    };
    return names[code] || code;
  };

  /**
   * Zwraca datę płatności zbiorczej która obejmuje daną datę odnowienia.
   * Bez argumentu – najbliższy billingDay.
   */
  const getNextBillingDateStr = (renewalDate?: string): string => {
    const billingDay = user?.billingDay;
    if (!billingDay) return "—";

    const today = new Date();
    const renewal = renewalDate ? new Date(renewalDate) : null;

    if (renewal) {
      let windowStart = new Date(today.getFullYear(), today.getMonth(), billingDay);
      if (windowStart <= today) {
        windowStart = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
      }
      for (let i = 0; i < 24; i++) {
        const windowEnd = new Date(
          windowStart.getFullYear(),
          windowStart.getMonth() + 1,
          billingDay - 1
        );
        windowEnd.setHours(23, 59, 59, 999);
        if (renewal >= windowStart && renewal <= windowEnd) {
          return windowStart.toLocaleDateString("pl-PL");
        }
        windowStart = new Date(
          windowStart.getFullYear(),
          windowStart.getMonth() + 1,
          billingDay
        );
      }
    }

    // Fallback – najbliższy billingDay
    const candidate = new Date(today.getFullYear(), today.getMonth(), billingDay);
    if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
    return candidate.toLocaleDateString("pl-PL");
  };

  /**
   * Zwraca pierwszy billingDay który wypada PO danej dacie odnowienia.
   * Używane dla downgrade – kiedy nowy plan zaczyna obowiązywać.
   */
  /**
 * nextRenewalDate - 1 dzień = ostatni dzień dostępu.
 * Używane: downgrade "Obecny plan obowiązuje do" + rezygnacja "Dostęp zachowasz do"
 */
const getRenewalMinusOne = (renewalDate?: string): string => {
  if (!renewalDate) return "—";
  const d = new Date(renewalDate);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("pl-PL");
};

/**
 * nextRenewalDate wprost = data kiedy nowy plan wchodzi w życie.
 * Używane: downgrade "Nowy plan zacznie od"
 */
const getRenewalDateStr = (renewalDate?: string): string => {
  if (!renewalDate) return "—";
  return new Date(renewalDate).toLocaleDateString("pl-PL");
};

  const getUpgradeCalc = () => {
    if (!selectedPlan || !currentUserPlan) return { diff: 0, credit: 0, daysLeft: 0 };
    const oldPrice = currentUserPlan.priceOverridePLN || currentUserPlan.plan?.pricePLN || 0;
    const newPrice = selectedPlan.pricePLN || 0;
    const today = new Date();
    const nextRenewal = currentUserPlan.nextRenewalDate
      ? new Date(currentUserPlan.nextRenewalDate)
      : new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const daysLeft = Math.max(1, Math.round((nextRenewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const diff = Math.round(((newPrice - oldPrice) / 30) * daysLeft * 100) / 100;
    const credit = Math.round((newPrice - Math.max(0, diff)) * 100) / 100;
    return { diff: Math.max(0, diff), credit: Math.max(0, credit), daysLeft };
  };

  // ── Handlers ──

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

    setSelectedPlan(plan);
    setShowChangePlan(true);
  };

  const handleAddNow = async () => {
    if (!selectedPlan) return;
    setShowAddOptions(false);
    try {
      await subscriptionsApi.create({
        planId: selectedPlan.id,
        paymentOption: "now",
      });
      Alert.alert(
        "Subskrypcja aktywowana",
        `Od teraz korzystasz z ${getProviderName(provider)}.`
      );
      router.back();
    } catch (e: any) {
      Alert.alert("Coś poszło nie tak", e.response?.data?.error || "Nie udało się dodać subskrypcji.");
    }
  };

  const handleAddNextBilling = async () => {
    if (!selectedPlan) return;
    setShowAddOptions(false);
    try {
      await subscriptionsApi.create({
        planId: selectedPlan.id,
        paymentOption: "next_billing",
      });
      Alert.alert(
        "Subskrypcja aktywowana",
        `Od teraz korzystasz z ${getProviderName(provider)}.\nOpłata zostanie doliczona do najbliższej płatności.`
      );
      router.back();
    } catch (e: any) {
      Alert.alert("Coś poszło nie tak", e.response?.data?.error || "Nie udało się dodać subskrypcji.");
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
    Alert.alert("Coś poszło nie tak", e.response?.data?.error || "Nie udało się zmienić planu.");
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
      Alert.alert("Coś poszło nie tak", e.response?.data?.error || "Nie udało się anulować subskrypcji.");
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

  // ── Render ──

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
  const { diff: upgradeDiff, daysLeft } = getUpgradeCalc();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>

        {/* Header */}
        <View style={{
          padding: 20, paddingTop: insets.top + 16, backgroundColor: "#fff",
          borderBottomWidth: 1, borderBottomColor: "#eee"
        }}>
          <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 28 }}>←</Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            {logo && (
              <Image source={logo} style={{ width: 60, height: 60, resizeMode: "contain" }} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: "800" }}>{providerName}</Text>
              <Text style={{ fontSize: 14, color: "#666", marginTop: 2 }}>
                {currentUserPlan ? "Zmień plan" : "Wybierz plan"} ({plans.length} dostępnych)
              </Text>
            </View>
            <Pressable
              onPress={() => setShowInfo(true)}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center"
              }}
            >
              <MaterialIcons name="info-outline" size={20} color="#000" />
            </Pressable>
          </View>
        </View>

        {/* Lista planów */}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {plans.map((plan) => {
            const planId = plan?.id;
            const price = Number(plan?.pricePLN ?? 0);
            const screens = Number(plan?.screens ?? 0);
            const uhd = Boolean(plan?.uhd);
            const ads = Boolean(plan?.ads);
            const cycle = plan?.cycle === "yearly" ? "yearly" : "monthly";
            const isPendingCancellation = currentUserPlan?.status === "pending_cancellation";
const isCurrentPlan = currentUserPlan?.planId === planId && !isPendingCancellation;
const isCancelledPlan = currentUserPlan?.planId === planId && isPendingCancellation;
const isPendingPlan = currentUserPlan?.pendingPlanId === planId;
            const isSelected = selectedPlan?.id === planId;

            return (
              <Pressable
                key={String(planId)}
                onPress={() => handlePlanSelect(plan)}
                style={{
                  padding: 16, borderWidth: 2,
                  borderColor: isCancelledPlan ? "rgba(239,68,68,0.4)"
  : isCurrentPlan ? "rgba(134,239,172,0.6)"
  : isPendingPlan ? "rgba(59,130,246,0.5)"
  : isSelected ? "#000"
                    : "#ddd",
                  borderRadius: 16, backgroundColor: "#fff",
                  shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  {logo && (
                    <Image source={logo} style={{ width: 50, height: 50, resizeMode: "contain" }} />
                  )}
                  <View style={{ flex: 1 }}>
                    {isCurrentPlan && (
                      <View style={{
                        alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4,
                        backgroundColor: "rgba(134,239,172,0.2)", borderRadius: 8, marginBottom: 8,
                        flexDirection: "row", alignItems: "center", gap: 4,
                        borderWidth: 1, borderColor: "rgba(134,239,172,0.4)"
                      }}>
                        <MaterialIcons name="check-circle" size={14} color="#16a34a" />
                        <Text style={{ color: "#16a34a", fontSize: 11, fontWeight: "700" }}>
                          Bieżący plan
                        </Text>
                      </View>
                    )}
                    {isCancelledPlan && (
  <View style={{
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 6, borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
    alignSelf: "flex-start", marginBottom: 8,
  }}>
    <Text style={{ fontSize: 10, fontWeight: "800", color: "#dc2626" }}>
      ANULOWANA
    </Text>
  </View>
)}
                    {isPendingPlan && (
                      <View style={{
                        alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4,
                        backgroundColor: "rgba(59,130,246,0.12)", borderRadius: 8, marginBottom: 8,
                        flexDirection: "row", alignItems: "center", gap: 4,
                        borderWidth: 1, borderColor: "rgba(59,130,246,0.4)"
                      }}>
                        <MaterialIcons name="schedule" size={14} color="#2563eb" />
                        <Text style={{ color: "#2563eb", fontSize: 11, fontWeight: "700" }}>
                          W trakcie zmiany
                        </Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8, color: "#000" }}>
                      {formatPlanName(provider, plan?.planName ?? "")}
                    </Text>
                    <Text style={{ fontSize: 24, fontWeight: "800", color: "#000", marginBottom: 12 }}>
                      {price.toFixed(2)} zł
                      <Text style={{ fontSize: 14, fontWeight: "400", color: "#666" }}>
                        {cycle === "yearly" ? " / rok" : " / miesiąc"}
                      </Text>
                    </Text>
                    <View style={{ gap: 6 }}>
                      <PlanFeature icon="tv" text={`${screens} ${screens === 1 ? "ekran" : "ekrany"}`} />
                      <PlanFeature icon="4k" text={uhd ? "Jakość 4K Ultra HD" : "Jakość HD"} />
                      <PlanFeature
                        icon={ads ? "new-releases" : "block"}
                        text={ads ? "Z reklamami" : "Bez reklam"}
                        warning={ads}
                      />
                    </View>
                  </View>
                  {isSelected && !isCurrentPlan && (
                    <View style={{
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: "#000", justifyContent: "center", alignItems: "center"
                    }}>
                      <Text style={{ color: "#fff", fontSize: 16 }}>✓</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}

          {/* Przycisk rezygnacji */}
          {currentUserPlan && currentUserPlan.status !== "pending_cancellation" && (
            <Pressable
              onPress={() => setShowCancelConfirm(true)}
              style={{
                paddingVertical: 16, paddingHorizontal: 16,
                backgroundColor: "#fff", borderRadius: 14,
                borderWidth: 1.5, borderColor: "#fca5a5",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ color: "#dc2626", fontWeight: "800", fontSize: 15 }}>
                Anuluj subskrypcję
              </Text>
            </Pressable>
          )}

          {currentUserPlan?.status === "pending_cancellation" && (
  <View style={{
    marginTop: 8, padding: 16,
    backgroundColor: "#fff5f5", borderRadius: 14,
    borderWidth: 1.5, borderColor: "#fca5a5",
    gap: 10,
  }}>
    <Text style={{ fontSize: 14, fontWeight: "800", color: "#dc2626" }}>
      Subskrypcja została anulowana.
    </Text>
    <Text style={{ fontSize: 13, color: "#dc2626", lineHeight: 20 }}>
      Dostęp do platformy wygaśnie{" "}
      <Text style={{ fontWeight: "700" }}>
        {currentUserPlan.activeUntil
          ? new Date(currentUserPlan.activeUntil).toLocaleDateString("pl-PL")
          : currentUserPlan.nextRenewalDate
            ? new Date(currentUserPlan.nextRenewalDate).toLocaleDateString("pl-PL")
            : "—"}
      </Text>
    </Text>
    <Text
      onPress={() => setShowReactivateConfirm(true)}
      style={{
        marginTop: 6,
        fontSize: 14,
        fontWeight: "700",
        color: "#dc2626",
        textAlign: "center",
      }}
    >
      Włącz ponownie
    </Text>
  </View>
)}
        </ScrollView>

        {/* ── MODAL: Dodanie nowej platformy ── */}
        <Modal
          visible={showAddOptions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddOptions(false)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={{
              backgroundColor: "#fff", borderTopLeftRadius: 24,
              borderTopRightRadius: 24, padding: 24
            }}>
              <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 4 }}>
                Wybierz formę płatności
              </Text>
              <Text style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>
                {providerName} · {selectedPlan?.pricePLN?.toFixed(2)} zł
                {selectedPlan?.cycle === "yearly" ? "/rok" : "/mies"}
              </Text>

              {/* Opcja A – zapłać teraz */}
              <Pressable
                onPress={handleAddNow}
                style={{
                  padding: 18, backgroundColor: "#000",
                  borderRadius: 14, marginBottom: 12
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <MaterialIcons name="bolt" size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Zapłać teraz</Text>
                </View>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 20 }}>
                  Nowy plan zostanie aktywowany natychmiast. Dokonujesz jednorazowej opłaty w wysokości{" "}
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    {selectedPlan?.pricePLN?.toFixed(2)} zł
                  </Text>.{" "}
                  Rozliczenie tej usługi w Subii rozpocznie się od kolejnego okresu.
                </Text>
              </Pressable>

              {/* Opcja B – zapłać później */}
              <Pressable
                onPress={handleAddNextBilling}
                style={{
                  padding: 18, backgroundColor: "#f9f9f9",
                  borderRadius: 14, borderWidth: 1.5,
                  borderColor: "#e0e0e0", marginBottom: 16
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <MaterialIcons name="event" size={18} color="#111" />
                  <Text style={{ color: "#000", fontWeight: "800", fontSize: 16 }}>Zapłać później</Text>
                </View>
                <Text style={{ color: "#555", fontSize: 13, lineHeight: 20 }}>
                  Dostęp otrzymasz natychmiast. Rozliczenie zostanie doliczone do najbliższej płatności w Subii (
                  <Text style={{ fontWeight: "700", color: "#000" }}>
                    {getNextBillingDateStr()}
                  </Text>
                  ) i obejmie dwa okresy rozliczeniowe.{"\n"}
                  Każda kolejna płatność będzie naliczana w standardowej wysokości za jeden miesiąc.
                </Text>
              </Pressable>

              <Pressable
                onPress={() => { setShowAddOptions(false); setSelectedPlan(null); setRenewalDay(null); }}
                style={{ padding: 14, backgroundColor: "#f0f0f0", borderRadius: 12, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "600" }}>Anuluj</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: Zmiana planu (upgrade i downgrade) ── */}
        <Modal
          visible={showChangePlan}
          transparent
          animationType="slide"
          onRequestClose={() => { setShowChangePlan(false); setSelectedPlan(null); }}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
            }}>
              {(() => {
                if (!selectedPlan || !currentUserPlan) return null;

                const oldPrice = currentUserPlan.priceOverridePLN || currentUserPlan.plan?.pricePLN || 0;
                const newPrice = selectedPlan.pricePLN || 0;
                const isUpgrade = newPrice > oldPrice;
                const oldPlan = currentUserPlan.plan;

                // Co się zmienia
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
const billingDateStr = getNextBillingDateStr(currentUserPlan?.nextRenewalDate);
const currentPlanUntilStr = getRenewalMinusOne(currentUserPlan?.nextRenewalDate);
const newPlanStartStr = getRenewalDateStr(currentUserPlan?.nextRenewalDate);

                return (
                  <>
                    {/* Nagłówek */}
                    <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 4 }}>
                      Zmiana planu
                    </Text>
                    <Text style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
                      {formatPlanName(provider, oldPlan?.planName ?? "")} ({oldPrice.toFixed(2)} zł)
                      {"  →  "}
                      {formatPlanName(provider, selectedPlan?.planName ?? "")} ({newPrice.toFixed(2)} zł)
                    </Text>

                    {/* Co się zmienia */}
                    {changes.length > 0 && (
                      <View style={{
                        backgroundColor: "#f9f9f9", borderRadius: 12,
                        padding: 14, marginBottom: 14, gap: 8,
                      }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#333", marginBottom: 2 }}>
                          Co się zmienia:
                        </Text>
                        {changes.map((c, i) => (
                          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ fontSize: 14, color: c.positive ? "#16a34a" : "#dc2626" }}>
                              {c.positive ? "✓" : "✕"}
                            </Text>
                            <Text style={{ fontSize: 13, color: "#333" }}>{c.text}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Info o płatności */}
                    <View style={{
                      padding: 16,
                      backgroundColor: isUpgrade ? "#fff5f0" : "#f0f9ff",
                      borderRadius: 12, marginBottom: 20,
                      borderWidth: 1,
                      borderColor: isUpgrade ? "#fed7aa" : "#bae6fd",
                    }}>
                      {isUpgrade ? (
                        <Text style={{ fontSize: 14, color: "#9a3412", lineHeight: 22 }}>
                          Po zmianie planu korzystasz z nowej wersji natychmiast.{"\n\n"}
                          Najbliższa płatność w Subii (
                          <Text style={{ fontWeight: "700" }}>{billingDateStr}</Text>
                          ) będzie w wysokości{" "}
                          <Text style={{ fontWeight: "700" }}>{newPrice.toFixed(2)} zł</Text>
                          {" "}oraz zostanie powiększona o proporcjonalny koszt podwyższenia za pozostałe{" "}
                          <Text style={{ fontWeight: "700" }}>{daysLeft} dni</Text>
                          {" "}(ok.{" "}
                          <Text style={{ fontWeight: "700" }}>{upgradeDiff.toFixed(2)} zł</Text>
                          ).{"\n\n"}
                          Każda kolejna płatność będzie naliczana według nowej ceny.
                        </Text>
                      ) : (
 <Text style={{ fontSize: 14, color: "#0369a1", lineHeight: 22 }}>
  Obecny plan obowiązuje do{" "}
  <Text style={{ fontWeight: "700" }}>{currentPlanUntilStr}</Text>.{"\n\n"}
  Nowy plan{" "}
  <Text style={{ fontWeight: "700" }}>
    {formatPlanName(provider, selectedPlan?.planName ?? "")}
  </Text>
  {" "}zacznie obowiązywać od{" "}
  <Text style={{ fontWeight: "700" }}>{newPlanStartStr}</Text>.{"\n\n"}
                          Od tego momentu opłata w Subii będzie naliczana według nowej ceny{" "}
                          <Text style={{ fontWeight: "700" }}>{newPrice.toFixed(2)} zł / mies</Text>.
                        </Text>
                      )}
                    </View>

                    {/* Przyciski */}
                    <Pressable
                      onPress={handleChangePlanConfirm}
                      style={{
                        padding: 18, backgroundColor: "#000",
                        borderRadius: 14, marginBottom: 12, alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                        Potwierdź zmianę planu
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => { setShowChangePlan(false); setSelectedPlan(null); }}
                      style={{ padding: 14, backgroundColor: "#f0f0f0", borderRadius: 12, alignItems: "center" }}
                    >
                      <Text style={{ fontWeight: "700", color: "#333" }}>Anuluj</Text>
                    </Pressable>
                  </>
                );
              })()}
            </View>
          </View>
        </Modal>

        {/* ── MODAL: Info o platformie ── */}
        <Modal
          visible={showInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInfo(false)}
        >
          <Pressable
            style={{
              flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center", alignItems: "center", padding: 20
            }}
            onPress={() => setShowInfo(false)}
          >
            <Pressable
              style={{
                backgroundColor: "#fff", borderRadius: 20,
                padding: 24, width: "100%", maxWidth: 400
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
                {logo && (
                  <Image source={logo} style={{ width: 40, height: 40, resizeMode: "contain" }} />
                )}
                <Text style={{ fontSize: 20, fontWeight: "800", flex: 1 }}>{providerName}</Text>
                <Pressable onPress={() => setShowInfo(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </Pressable>
              </View>
              <Text style={{ fontSize: 14, color: "#666", lineHeight: 22 }}>{description}</Text>
              <Pressable
                onPress={() => setShowInfo(false)}
                style={{ marginTop: 20, padding: 14, backgroundColor: "#f0f0f0", borderRadius: 10, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "600", color: "#000" }}>Zamknij</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── MODAL: Potwierdzenie rezygnacji ── */}
        <Modal
          visible={showCancelConfirm}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCancelConfirm(false)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={{
              backgroundColor: "#fff", borderTopLeftRadius: 24,
              borderTopRightRadius: 24, padding: 24
            }}>
              <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 4 }}>
                Zrezygnować z {providerName}?
              </Text>
              <Text style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>
                {currentUserPlan?.plan?.planName} · {(currentUserPlan?.priceOverridePLN || currentUserPlan?.plan?.pricePLN || 0).toFixed(2)} zł/mies
              </Text>

              <View style={{
                padding: 16, backgroundColor: "#fff5f5", borderRadius: 12,
                marginBottom: 20, borderWidth: 1, borderColor: "#fca5a5"
              }}>
                <Text style={{ fontSize: 14, color: "#dc2626", lineHeight: 24 }}>
                  {"• "}Dostęp do {providerName} zachowasz do{" "}
<Text style={{ fontWeight: "700" }}>
  {getRenewalMinusOne(currentUserPlan?.nextRenewalDate)}
</Text>
                  {"\n• "}Przy następnej płatności zbiorczej ta platforma{" "}
                  <Text style={{ fontWeight: "700" }}>nie zostanie doliczona</Text>
                  {"\n• "}Po tym dniu subskrypcja wygaśnie automatycznie
                </Text>
              </View>

              <Pressable
                onPress={handleCancelSubscription}
                style={{
                  padding: 18, backgroundColor: "#dc2626",
                  borderRadius: 14, marginBottom: 12
                }}
              >
                <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 16 }}>
                  Tak, rezygnuję
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setShowCancelConfirm(false)}
                style={{ padding: 14, backgroundColor: "#f0f0f0", borderRadius: 12, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "600" }}>Anuluj</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
{/* MODAL: Reaktywacja */}
<Modal
  visible={showReactivateConfirm}
  transparent
  animationType="slide"
  onRequestClose={() => setShowReactivateConfirm(false)}
>
  <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
    <View style={{
      backgroundColor: "#fff",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
    }}>
      <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 6 }}>
        Aktywować subskrypcję {providerName}?
      </Text>
      <Text style={{ fontSize: 13, color: "#666", lineHeight: 18, marginBottom: 20 }}>
        Subskrypcja zostanie ponownie aktywowana. Dostęp pozostanie bez przerwy.
      </Text>

      <View style={{
        padding: 16, backgroundColor: "#fff",
        borderRadius: 12, borderWidth: 1,
        borderColor: "#eee", gap: 10, marginBottom: 20,
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 14, color: "#666" }}>Najbliższe odnowienie</Text>
          <Text style={{ fontSize: 14, fontWeight: "800", color: "#000" }}>
            {currentUserPlan?.nextRenewalDate
              ? new Date(currentUserPlan.nextRenewalDate).toLocaleDateString("pl-PL")
              : "—"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 14, color: "#666" }}>Kwota</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
            {(currentUserPlan?.priceOverridePLN || currentUserPlan?.plan?.pricePLN || 0).toFixed(2)} zł / {currentUserPlan?.plan?.cycle === "yearly" ? "rok" : "mies."}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={handleReactivateConfirm}
        style={{
          padding: 18, backgroundColor: "#000",
          borderRadius: 14, marginBottom: 12,
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800", fontSize: 16 }}>
          Aktywuj subskrypcję
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setShowReactivateConfirm(false)}
        style={{ padding: 14, backgroundColor: "#f0f0f0", borderRadius: 12, alignItems: "center" }}
      >
        <Text style={{ fontWeight: "700", color: "#333" }}>Anuluj</Text>
      </Pressable>
    </View>
  </View>
</Modal>


      </View>
    </KeyboardAvoidingView>
  );
}

function PlanFeature({ icon, text, warning }: { icon: string; text: string; warning?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <MaterialIcons name={icon as any} size={18} color={warning ? "#f59e0b" : "#666"} />
      <Text style={{ fontSize: 13, color: warning ? "#f59e0b" : "#666", fontWeight: warning ? "600" : "400" }}>
        {text}
      </Text>
    </View>
  );
}