import { useState, useEffect } from "react";
import {
  View, Text, Pressable, Alert, ActivityIndicator, Image,
  ScrollView, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { plansApi, subscriptionsApi } from "../src/lib/api";
import { getProviderLogo, formatPlanName, getProviderDescription } from "../src/lib/provider-logos";
import { MaterialIcons } from "@expo/vector-icons";
import { storage } from "../src/lib/storage";

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
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  const [showDowngradeInfo, setShowDowngradeInfo] = useState(false);
  const [renewalDay, setRenewalDay] = useState<number | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!provider) return;
    const ref = { current: true };
    loadData(ref);
    return () => { ref.current = false; };
  }, [provider]);

  const loadData = async (ref: { current: boolean }) => {
    try {
      const savedUser = await storage.getUser();
      if (ref.current) setUser(savedUser);

      const [plansRes, subsRes] = await Promise.all([
        plansApi.getAll(),
        subscriptionsApi.getAll(),
      ]);

      if (!ref.current) return;

      const filtered = (plansRes?.plans || []).filter(
        (p: any) => p?.providerCode === provider
      );
      setPlans(filtered);

      const allSubs = subsRes?.subscriptions || [];
      setHasAnySubscription(allSubs.length > 0);

      const userSub = allSubs.find(
        (s: any) => s?.providerCode === provider && s?.status === "active"
      );
      setCurrentUserPlan(userSub || null);
    } catch {
      Alert.alert("Błąd", "Nie udało się pobrać danych");
    } finally {
      if (ref.current) setLoading(false);
    }
  };

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);

    if (currentUserPlan) {
      const oldPrice = currentUserPlan.priceOverridePLN || currentUserPlan.plan?.pricePLN || 0;
      const newPrice = plan.pricePLN || 0;

      if (plan.id === currentUserPlan.planId) {
        Alert.alert("Info", "To jest Twój obecny plan.");
        setSelectedPlan(null);
        return;
      }

      if (newPrice > oldPrice) {
        setShowUpgradeOptions(true);
      } else {
        setShowDowngradeInfo(true);
      }
    } else {
      // Nowa subskrypcja – renewalDay = dzisiejszy dzień, od razu opcje płatności
      setRenewalDay(new Date().getDate());
      setShowAddOptions(true);
    }
  };

  const handleAddNow = async () => {
    if (!selectedPlan || !renewalDay) return;
    setShowAddOptions(false);

    try {
      await subscriptionsApi.create({
        planId: selectedPlan.id,
        renewalDay,
        paymentOption: "now",
      });
      Alert.alert(
        "Gotowe! 🎉",
        `${getProviderName(provider)} aktywny od dziś.\nOpłata ${selectedPlan.pricePLN.toFixed(2)} zł pobrana z portfela.`
      );
      router.back();
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się dodać");
    }
  };

  const handleAddNextBilling = async () => {
    if (!selectedPlan || !renewalDay) return;
    setShowAddOptions(false);

    try {
      await subscriptionsApi.create({
        planId: selectedPlan.id,
        renewalDay,
        paymentOption: "next_billing",
      });
      Alert.alert(
        "Gotowe! 🎉",
        `${getProviderName(provider)} aktywny od dziś.\nZostanie doliczone do płatności ${getNextBillingDateStr()}.`
      );
      router.back();
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się dodać");
    }
  };

  const handleUpgradeNow = async () => {
    if (!selectedPlan || !currentUserPlan) return;
    setShowUpgradeOptions(false);

    try {
      await subscriptionsApi.update(currentUserPlan.id, {
        planId: selectedPlan.id,
        upgradeOption: "now",
      });
      const { credit } = getUpgradeCalc();
      Alert.alert(
        "Plan zmieniony! 🎉",
        `Nowy plan aktywny od dziś.\nNadpłata ${credit.toFixed(2)} zł dodana jako credit do portfela.`
      );
      router.back();
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się zmienić");
    }
  };

  const handleUpgradeNextBilling = async () => {
    if (!selectedPlan || !currentUserPlan) return;
    setShowUpgradeOptions(false);

    try {
      await subscriptionsApi.update(currentUserPlan.id, {
        planId: selectedPlan.id,
        upgradeOption: "next_billing",
      });
      Alert.alert(
        "Plan zmieniony! 🎉",
        `Nowy plan wejdzie w życie ${getNextBillingDateStr()}.`
      );
      router.back();
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się zmienić");
    }
  };

  const handleDowngradeConfirm = async () => {
    if (!selectedPlan || !currentUserPlan) return;
    setShowDowngradeInfo(false);

    try {
      await subscriptionsApi.update(currentUserPlan.id, {
        planId: selectedPlan.id,
        upgradeOption: "next_billing",
      });
      Alert.alert(
        "Plan zmieniony! 🎉",
        `Tańszy plan wejdzie w życie ${getNextBillingDateStr()}.`
      );
      router.back();
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się zmienić");
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
      "Rezygnacja przyjęta",
      `Dostęp do ${providerName} masz do ${until}.\nPrzy następnej płatności zbiorczej ta platforma nie zostanie już doliczona.`
    );
    router.back();
  } catch (e: any) {
    Alert.alert("Błąd", e.response?.data?.error || "Nie udało się zrezygnować");
  }
};

  // Helpers
  const getProviderName = (code: string): string => {
    const names: Record<string, string> = {
      netflix: "Netflix", disney_plus: "Disney+",
      prime_video: "Prime Video", hbo_max: "Max", apple_tv: "Apple TV+",
    };
    return names[code] || code;
  };

  const getNextBillingDateStr = (): string => {
    const billingDay = user?.billingDay;
    if (!billingDay) return "—";
    const today = new Date();
    const candidate = new Date(today.getFullYear(), today.getMonth(), billingDay);
    if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
    return candidate.toLocaleDateString("pl-PL");
  };

  const getNextRenewalDateStr = (): string => {
    const day = renewalDay || new Date().getDate();
    const today = new Date();
    const candidate = new Date(today.getFullYear(), today.getMonth(), day);
    if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
    return candidate.toLocaleDateString("pl-PL");
  };

  const getSecondRenewalDateStr = (): string => {
    const day = renewalDay || new Date().getDate();
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), day);
    if (first <= today) first.setMonth(first.getMonth() + 1);
    const second = new Date(first.getFullYear(), first.getMonth() + 1, day);
    return second.toLocaleDateString("pl-PL");
  };

  const getUpgradeCalc = () => {
    if (!selectedPlan || !currentUserPlan) return { diff: 0, credit: 0, daysLeft: 0 };
    const oldPrice = currentUserPlan.priceOverridePLN || currentUserPlan.plan?.pricePLN || 0;
    const newPrice = selectedPlan.pricePLN || 0;
    const renewalD = currentUserPlan.renewalDay || new Date().getDate();
    const today = new Date();
    const nextRenewal = new Date(today.getFullYear(), today.getMonth() + (today.getDate() < renewalD ? 0 : 1), renewalD);
    if (nextRenewal <= today) nextRenewal.setMonth(nextRenewal.getMonth() + 1);
    const daysLeft = Math.max(1, Math.round((nextRenewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const diff = Math.round(((newPrice - oldPrice) / 30) * daysLeft * 100) / 100;
    const credit = Math.round((newPrice - Math.max(0, diff)) * 100) / 100;
    return { diff: Math.max(0, diff), credit: Math.max(0, credit), daysLeft };
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
  const { diff: upgradeDiff, credit: upgradeCredit, daysLeft } = getUpgradeCalc();
  const todayStr = new Date().toLocaleDateString("pl-PL");

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>

        {/* Header */}
        <View style={{
          padding: 20, paddingTop: 60, backgroundColor: "#fff",
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
            const isCurrentPlan = currentUserPlan?.planId === planId;
            const isSelected = selectedPlan?.id === planId;

            return (
              <Pressable
                key={String(planId)}
                onPress={() => handlePlanSelect(plan)}
                style={{
                  padding: 16, borderWidth: 2,
                  borderColor: isCurrentPlan ? "rgba(134,239,172,0.6)" : isSelected ? "#000" : "#ddd",
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
                          Twój plan
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
          {/* Przycisk rezygnacji – tylko gdy jest aktywny plan */}
{currentUserPlan && currentUserPlan.status !== "pending_cancellation" && (
  <Pressable
    onPress={() => setShowCancelConfirm(true)}
    style={{
      marginTop: 8, padding: 16,
      backgroundColor: "#fff",
      borderRadius: 14, borderWidth: 1.5,
      borderColor: "#fca5a5",
    }}
  >
    <Text style={{ color: "#dc2626", textAlign: "center", fontWeight: "700", fontSize: 15 }}>
      🚫 Zrezygnuj z {providerName}
    </Text>
  </Pressable>
)}

{currentUserPlan?.status === "pending_cancellation" && (
  <View style={{
    marginTop: 8, padding: 16,
    backgroundColor: "#fff5f5",
    borderRadius: 14, borderWidth: 1.5,
    borderColor: "#fca5a5",
  }}>
    <Text style={{ color: "#dc2626", textAlign: "center", fontWeight: "700", fontSize: 15 }}>
      🚫 Rezygnacja w toku
    </Text>
    <Text style={{ color: "#dc2626", textAlign: "center", fontSize: 13, marginTop: 4 }}>
      Dostęp do: {currentUserPlan.activeUntil
        ? new Date(currentUserPlan.activeUntil).toLocaleDateString("pl-PL")
        : "—"}
    </Text>
  </View>
)}
        </ScrollView>

        {/* ── MODAL: Opcje dodania nowej platformy ── */}
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
                Jak chcesz zapłacić?
              </Text>
              <Text style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>
                {providerName} · {selectedPlan?.pricePLN?.toFixed(2)} zł/mies
              </Text>

              {/* Opcja A */}
              <Pressable
                onPress={handleAddNow}
                style={{
                  padding: 18, backgroundColor: "#000",
                  borderRadius: 14, marginBottom: 12
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 18 }}>💳</Text>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Zapłać teraz</Text>
                </View>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 20 }}>
                  • {todayStr} płacisz <Text style={{ color: "#fff", fontWeight: "700" }}>{selectedPlan?.pricePLN?.toFixed(2)} zł</Text>{"\n"}
                  • Usługa aktywna natychmiast{"\n"}
                  • {getNextBillingDateStr()} – {providerName} <Text style={{ color: "#fff", fontWeight: "700" }}>nie jest</Text> doliczany{"\n"}
                  • Od kolejnego cyklu wraca do normalnego rozliczenia
                </Text>
              </Pressable>

              {/* Opcja B */}
              <Pressable
                onPress={handleAddNextBilling}
                style={{
                  padding: 18, backgroundColor: "#f9f9f9",
                  borderRadius: 14, borderWidth: 1.5,
                  borderColor: "#e0e0e0", marginBottom: 16
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 18 }}>📅</Text>
                  <Text style={{ color: "#000", fontWeight: "800", fontSize: 16 }}>
                    Dolicz do następnej płatności
                  </Text>
                </View>
                <Text style={{ color: "#555", fontSize: 13, lineHeight: 20 }}>
                  • Usługa aktywna od dziś, Subii finansuje pierwszy miesiąc{"\n"}
                  • {getNextBillingDateStr()} płacisz za <Text style={{ fontWeight: "700" }}>dwa okresy</Text>:{"\n"}
                  {"  "}{todayStr}–{getNextRenewalDateStr()}: <Text style={{ fontWeight: "700" }}>{selectedPlan?.pricePLN?.toFixed(2)} zł</Text>{"\n"}
                  {"  "}{getNextRenewalDateStr()}–{getSecondRenewalDateStr()}: <Text style={{ fontWeight: "700" }}>{selectedPlan?.pricePLN?.toFixed(2)} zł</Text>{"\n"}
                  • Łącznie: <Text style={{ fontWeight: "700" }}>
                    {selectedPlan ? (selectedPlan.pricePLN * 2).toFixed(2) : "—"} zł
                  </Text>{"\n"}
                  • Potem normalny cykl miesięczny
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

        {/* ── MODAL: Opcje upgrade (tańszy→droższy) ── */}
        <Modal
          visible={showUpgradeOptions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowUpgradeOptions(false)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={{
              backgroundColor: "#fff", borderTopLeftRadius: 24,
              borderTopRightRadius: 24, padding: 24
            }}>
              <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 4 }}>
                Kiedy zmienić plan?
              </Text>
              <Text style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>
                {currentUserPlan?.plan?.planName} ({(currentUserPlan?.priceOverridePLN || currentUserPlan?.plan?.pricePLN || 0).toFixed(2)} zł)
                {" → "}
                {selectedPlan?.planName} ({selectedPlan?.pricePLN?.toFixed(2)} zł)
              </Text>

              {/* Opcja A – zmień teraz */}
              <Pressable
                onPress={handleUpgradeNow}
                style={{ padding: 18, backgroundColor: "#000", borderRadius: 14, marginBottom: 12 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 18 }}>💳</Text>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Zmień teraz</Text>
                </View>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 20 }}>
                  • Nowy plan aktywny natychmiast{"\n"}
                  • Platforma naliczy ~<Text style={{ color: "#fff", fontWeight: "700" }}>{upgradeDiff.toFixed(2)} zł</Text> dopłaty za pozostałe {daysLeft} dni{"\n"}
                  • Nadpłata ~<Text style={{ color: "#fff", fontWeight: "700" }}>{upgradeCredit.toFixed(2)} zł</Text> trafia jako <Text style={{ color: "#fff", fontWeight: "700" }}>credit</Text> na portfel{"\n"}
                  • Następna płatność {getNextBillingDateStr()} zostanie pomniejszona o credit
                </Text>
              </Pressable>

              {/* Opcja B – od następnej płatności */}
              <Pressable
                onPress={handleUpgradeNextBilling}
                style={{
                  padding: 18, backgroundColor: "#f9f9f9",
                  borderRadius: 14, borderWidth: 1.5,
                  borderColor: "#e0e0e0", marginBottom: 16
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 18 }}>📅</Text>
                  <Text style={{ color: "#000", fontWeight: "800", fontSize: 16 }}>
                    Od następnej płatności
                  </Text>
                </View>
                <Text style={{ color: "#555", fontSize: 13, lineHeight: 20 }}>
                  • Obecny plan aktywny do {getNextBillingDateStr()}{"\n"}
                  • Subii pokrywa ewentualną dopłatę za upgrade{"\n"}
                  • {getNextBillingDateStr()} płacisz nową cenę{" "}
                  <Text style={{ fontWeight: "700" }}>{selectedPlan?.pricePLN?.toFixed(2)} zł</Text> + wyrównanie
                </Text>
              </Pressable>

              <Pressable
                onPress={() => { setShowUpgradeOptions(false); setSelectedPlan(null); }}
                style={{ padding: 14, backgroundColor: "#f0f0f0", borderRadius: 12, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "600" }}>Anuluj</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: Info o downgrade (droższy→tańszy) ── */}
        <Modal
          visible={showDowngradeInfo}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDowngradeInfo(false)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={{
              backgroundColor: "#fff", borderTopLeftRadius: 24,
              borderTopRightRadius: 24, padding: 24
            }}>
              <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 4 }}>
                Zmiana na tańszy plan
              </Text>
              <Text style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>
                {currentUserPlan?.plan?.planName} ({(currentUserPlan?.priceOverridePLN || currentUserPlan?.plan?.pricePLN || 0).toFixed(2)} zł)
                {" → "}
                {selectedPlan?.planName} ({selectedPlan?.pricePLN?.toFixed(2)} zł)
              </Text>

              <View style={{
                padding: 16, backgroundColor: "#f0f9ff", borderRadius: 12,
                marginBottom: 20, borderWidth: 1, borderColor: "#bae6fd"
              }}>
                <Text style={{ fontSize: 14, color: "#0369a1", lineHeight: 22 }}>
                  ℹ️ Obecny plan pozostaje aktywny do końca opłaconego okresu.{"\n\n"}
                  Nowy tańszy plan wejdzie w życie{" "}
                  <Text style={{ fontWeight: "700" }}>{getNextBillingDateStr()}</Text> – w dniu Twojej najbliższej płatności zbiorczej.{"\n\n"}
                  Od tego dnia będziesz płacić{" "}
                  <Text style={{ fontWeight: "700" }}>{selectedPlan?.pricePLN?.toFixed(2)} zł/mies</Text> za {providerName}.
                </Text>
              </View>

              <Pressable
                onPress={handleDowngradeConfirm}
                style={{ padding: 18, backgroundColor: "#000", borderRadius: 14, marginBottom: 12 }}
              >
                <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 16 }}>
                  Potwierdź zmianę planu
                </Text>
              </Pressable>

              <Pressable
                onPress={() => { setShowDowngradeInfo(false); setSelectedPlan(null); }}
                style={{ padding: 14, backgroundColor: "#f0f0f0", borderRadius: 12, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "600" }}>Anuluj</Text>
              </Pressable>
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
        <Text style={{ fontSize: 14, color: "#dc2626", lineHeight: 22 }}>
          • Dostęp do {providerName} zachowasz do <Text style={{ fontWeight: "700" }}>{getNextBillingDateStr()}</Text>{"\n"}
          • Przy następnej płatności zbiorczej ta platforma <Text style={{ fontWeight: "700" }}>nie zostanie doliczona</Text>{"\n"}
          • Po tym dniu subskrypcja wygaśnie automatycznie
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