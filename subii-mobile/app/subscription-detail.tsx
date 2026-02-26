//subscription-detail.tsx

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { api, subscriptionsApi } from "../src/lib/api";
import { getProviderLogo, getProviderName } from "../src/lib/provider-logos";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getNextBillingDateStr } from "../src/lib/billing";

/**
 * Wylicza datę kolejnego odnowienia subskrypcji:
 * - yearly: co rok od createdAt (szuka pierwszej daty > dziś)
 * - monthly: najbliższy renewalDay po dzisiejszej dacie
 */

/**
 * Zwraca tekstową datę najbliższej "zintegrowanej płatności" użytkownika
 * na podstawie user.billingDay.
 */

/**
 * Mapowanie kodu providera na nazwę do UI.
 * (Fallback: zwróć kod, jeśli nie ma w mapie)
 */

/**
 * Modal "bottom sheet" z własną animacją:
 * - when visible=true: fade-in backdrop + slide-up sheet
 * - when close: fade-out backdrop + slide-down sheet, dopiero potem unmount
 * - klik w tło uruchamia animację zamknięcia (bez "sztywnego" znikania)
 */
function AnimatedSheetModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // mounted kontroluje czy Modal ma w ogóle istnieć w drzewie
  const [mounted, setMounted] = useState(visible);

  // animowane wartości
  const backdropOpacity = useState(() => new Animated.Value(0))[0];
  const sheetTranslateY = useState(() => new Animated.Value(24))[0];

  useEffect(() => {
    // otwarcie
    if (visible) {
      setMounted(true);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    // zamknięcie gdy rodzic ustawi visible=false
    if (mounted) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 24,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, backdropOpacity, sheetTranslateY]);

  /**
   * Zamykanie po kliknięciu w tło (lub back button na Androidzie):
   * najpierw animacja, potem unmount + onClose w rodzicu.
   */
  const closeWithAnimation = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 24,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        onClose(); // dopiero po animacji zmieniamy stan w rodzicu
      }
    });
  };

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={closeWithAnimation}
    >
      <View style={{ flex: 1 }}>
        {/* Backdrop (zacienienie) z płynnym fade */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0,0,0,0.5)", opacity: backdropOpacity },
          ]}
        />

        {/* Obszar klikalny tła (klik = zamknięcie) */}
        <Pressable style={{ flex: 1 }} onPress={closeWithAnimation} />

        {/* Sheet (zjeżdża z dołu) */}
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function SubscriptionDetail() {
  const router = useRouter();
  // id subskrypcji z parametrów routingu
  const { id } = useLocalSearchParams<{ id: string }>();

  // dane
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // sterowanie modalami
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);

  // "Nowości" (tytuły z providera)
  const [movies, setMovies] = useState<any[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(false);

  const insets = useSafeAreaInsets();

  // załaduj dane przy wejściu / zmianie id
  useFocusEffect(
  useCallback(() => {
    loadData();
  }, [id])
);

  /**
   * Ładuje użytkownika ze storage + subskrypcje z API,
   * znajduje subskrypcję po id i dociąga tytuły (movies) dla providera.
   */
  const loadData = async () => {
    try {
      const { storage } = await import("../src/lib/storage");
      const savedUser = await storage.getUser();
      setUser(savedUser);

      // pobierz listę subskrypcji i znajdź tę konkretną
      const res = await api.get("/api/subscriptions");
      const all = res.data.subscriptions || [];
      const found = all.find((s: any) => String(s.id) === String(id));

      if (!found) {
        Alert.alert(
          "Nie znaleziono subskrypcji",
          "Ta subskrypcja nie istnieje lub została usunięta."
        );
        router.back();
        return;
      }

      setSubscription(found);
      // dociągnij tytuły dla providera subskrypcji
      loadMovies(found.providerCode);
    } catch {
      // ogólny komunikat (brak tytułu = tytuł alertu w RN)
      Alert.alert("Sprawdź połączenie z internetem i spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Pobiera tytuły/nowości dla danego providera przez endpoint backendu.
   */
  const loadMovies = async (providerCode: string) => {
    setMoviesLoading(true);
    try {
      const res = await api.get(`/api/provider-titles?provider=${providerCode}`);
      setMovies(res.data.titles || []);
    } catch {
      setMovies([]);
    } finally {
      setMoviesLoading(false);
    }
  };

  /**
   * Potwierdzenie reaktywacji:
   * ustawia status na "active" i czyści activeUntil/cancelledAt,
   * potem pokazuje Alert i odświeża dane.
   */
  const handleReactivateConfirm = async () => {
    setShowReactivateConfirm(false);
    try {
      await subscriptionsApi.update(subscription.id, {
        status: "active",
        activeUntil: null,
        cancelledAt: null,
      });
      Alert.alert(
        "Subskrypcja została aktywowana",
        "Dostęp do platformy został przywrócony.",
        [{ text: "OK", onPress: () => loadData() }]
      );
    } catch (e: any) {
      Alert.alert(
        "Nie udało się aktywować subskrypcji",
        e.response?.data?.error || "Spróbuj ponownie za chwilę."
      );
    }
  };

  /**
   * Potwierdzenie anulowania:
   * wywołuje endpoint delete. Zakładane zachowanie: backend "soft-cancel"
   * (ustawia pending_cancellation i zwraca activeUntil).
   * Po sukcesie pokazuje datę wygaśnięcia dostępu i wraca ekranem wstecz.
   */
  const handleCancelSubscription = async () => {
    if (!subscription) return;
    setShowCancelConfirm(false);
    try {
      const res = await subscriptionsApi.delete(subscription.id);
      const until = res.activeUntil
        ? new Date(res.activeUntil).toLocaleDateString("pl-PL")
        : "—";
      Alert.alert(
        "Subskrypcja została anulowana",
        `Dostęp do ${getProviderName(subscription.providerCode)} wygaśnie ${until}.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert(
        "Nie udało się anulować subskrypcji",
        e.response?.data?.error || "Spróbuj ponownie za chwilę."
      );
    }
  };

  /**
   * Przejście na ekran wyboru planu dla danego providera.
   */
  const handleOpenChangePlan = () => {
    router.push(
      `/subscriptions-select-plan?provider=${subscription.providerCode}` as any
    );
  };

  // loader ekranu
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!subscription) return null;

  // dane do UI
  const logo = getProviderLogo(subscription.providerCode);
  const providerName = getProviderName(subscription.providerCode);
  const cycle = subscription.plan?.cycle || "monthly";
  const isPendingChange = subscription.status === "pending_change";
const isPendingCancellation = subscription.status === "pending_cancellation";

const price = isPendingChange && subscription.pendingPlan
  ? subscription.pendingPlan.pricePLN
  : subscription.priceOverridePLN || subscription.plan?.pricePLN || 0;



  // daty do UI (odnowienie i zintegrowana płatność)
  const nextRenewalStr = subscription.nextRenewalDate
    ? new Date(subscription.nextRenewalDate).toLocaleDateString("pl-PL")
    : "—";
const nextBillingStr = getNextBillingDateStr(user?.billingDay, subscription?.nextRenewalDate);

const pendingPlan = subscription.pendingPlan;
const oldPrice = subscription.priceOverridePLN || subscription.plan?.pricePLN || 0;
const newPrice = pendingPlan?.pricePLN ?? oldPrice;
const oldScreens = subscription.plan?.screens ?? 0;
const newScreens = pendingPlan?.screens ?? oldScreens;
const oldUhd = subscription.plan?.uhd ?? false;
const newUhd = pendingPlan?.uhd ?? oldUhd;
const oldAds = subscription.plan?.ads ?? false;
const newAds = pendingPlan?.ads ?? oldAds;
const oldCycle = subscription.plan?.cycle ?? "monthly";
const newCycle = pendingPlan?.cycle ?? oldCycle;

  // Data wygaśnięcia dostępu (dla komunikatów) - jeśli backend ustawi activeUntil, użyj tego,
  // w innym wypadku fallback do nextRenewal.
  const accessUntilStr = subscription.activeUntil
    ? new Date(subscription.activeUntil).toLocaleDateString("pl-PL")
    : nextRenewalStr;

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 20,
          paddingHorizontal: 20,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#eee",
        }}
      >
        {/* back */}
        <Pressable onPress={() => router.back()} style={{ marginBottom:-5 }}>
          <Text style={{ fontSize: 28 }}>←</Text>
        </Pressable>

        {/* logo + nazwa + status */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          {logo && (
            <Image
              source={logo}
              style={{ width: 64, height: 64, resizeMode: "contain" }}
            />
          )}

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: "900" }}>
              {providerName}
            </Text>
            <Text style={{ fontSize: 14, color: "#666" }}>
              {subscription.plan?.planName}
            </Text>
          </View>

          {/* status pill */}
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: isPendingCancellation
                ? "rgba(239,68,68,0.12)"
                : isPendingChange
                ? "rgba(59,130,246,0.12)"
                : "rgba(134,239,172,0.2)",
              borderWidth: 1,
              borderColor: isPendingCancellation
                ? "rgba(239,68,68,0.4)"
                : isPendingChange
                ? "rgba(59,130,246,0.4)"
                : "rgba(134,239,172,0.4)",
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "800",
                color: isPendingCancellation
                  ? "#dc2626"
                  : isPendingChange
                  ? "#2563eb"
                  : "#16a34a",
              }}
            >
              {isPendingCancellation
                ? "ANULOWANA"
                : isPendingChange
                ? "ZMIANA PLANU"
                : "AKTYWNA"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      >
        {/* Karta informacyjna gdy subskrypcja jest w trakcie wygaszania */}
        {isPendingCancellation && (
          <View
            style={{
              backgroundColor: "#fff5f5",
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: "#fca5a5",
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#dc2626" }}>
              Subskrypcja została anulowana.
            </Text>

            <Text style={{ fontSize: 13, color: "#dc2626", lineHeight: 20 }}>
              Dostęp do platformy wygaśnie{" "}
              <Text style={{ fontWeight: "700" }}>{accessUntilStr}</Text>
            </Text>

            {/* Link-style CTA - otwiera modal reaktywacji */}
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

        {/* Karta informacyjna gdy jest pending_change i jest pendingPlan */}
{isPendingChange && subscription.pendingPlan && (
  <View style={{
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 12,
  }}>
    <Text style={{ fontSize: 14, fontWeight: "800", color: "#1d4ed8" }}>
      Zmiana planu w toku
    </Text>

    <Text style={{ fontSize: 13, color: "#1d4ed8", lineHeight: 20 }}>
      {subscription.plan?.planName} → {subscription.pendingPlan.planName}
    </Text>

    <InfoRow
      label="Obecny plan do"
      value={nextRenewalStr}
      highlight
    />
    <InfoRow
      label="Nowa cena od następnego okresu"
      value={`${subscription.pendingPlan.pricePLN?.toFixed(2)} zł / ${
        cycle === "yearly" ? "rok" : "mies."
      }`}
    />
  </View>
)}

        {/* Szczegóły planu */}
<View
  style={{
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 14,
  }}
>
  <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 4 }}>
    Szczegóły planu
  </Text>

  {isPendingChange && pendingPlan ? (
    <>
      <InfoRowTransition
        label="Cena"
        oldValue={`${oldPrice.toFixed(2)} zł / ${oldCycle === "yearly" ? "rok" : "miesiąc"}`}
        newValue={`${newPrice.toFixed(2)} zł / ${newCycle === "yearly" ? "rok" : "miesiąc"}`}
        changed={oldPrice !== newPrice || oldCycle !== newCycle}
      />
      <InfoRowTransition
        label="Ekrany"
        oldValue={String(oldScreens)}
        newValue={String(newScreens)}
        changed={oldScreens !== newScreens}
      />
      <InfoRowTransition
        label="Jakość"
        oldValue={oldUhd ? "4K Ultra HD" : "HD"}
        newValue={newUhd ? "4K Ultra HD" : "HD"}
        changed={oldUhd !== newUhd}
      />
      <InfoRowTransition
        label="Reklamy"
        oldValue={oldAds ? "Tak" : "Nie"}
        newValue={newAds ? "Tak" : "Nie"}
        changed={oldAds !== newAds}
      />
      <InfoRowTransition
        label="Typ cyklu"
        oldValue={oldCycle === "yearly" ? "Roczna" : "Miesięczna"}
        newValue={newCycle === "yearly" ? "Roczna" : "Miesięczna"}
        changed={oldCycle !== newCycle}
      />
    </>
  ) : (
    <>
      <InfoRow
        label="Cena"
        value={`${price.toFixed(2)} zł / ${cycle === "yearly" ? "rok" : "miesiąc"}`}
      />
      <InfoRow
        label="Ekrany"
        value={String(subscription.plan?.screens ?? "—")}
      />
      <InfoRow
        label="Jakość"
        value={subscription.plan?.uhd ? "4K Ultra HD" : "HD"}
      />
      <InfoRow label="Reklamy" value={subscription.plan?.ads ? "Tak" : "Nie"} />
      <InfoRow
        label="Typ cyklu"
        value={cycle === "yearly" ? "Roczna" : "Miesięczna"}
      />
    </>
  )}
</View>

        {/* Rozliczenie */}
{/* Rozliczenie */}
<View
  style={{
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 14,
  }}
>
  <Text style={{ fontSize: 16, fontWeight: "800", marginBottom: 4 }}>
    Rozliczenie
  </Text>
  <InfoRow
    label="Aktywna od"
    value={new Date(subscription.createdAt).toLocaleDateString("pl-PL")}
  />
  <InfoRow
    label={cycle === "yearly" ? "Następne odnowienie (roczne)" : "Następne odnowienie"}
    value={isPendingCancellation ? "Anulowana" : nextRenewalStr}
    highlight={!isPendingCancellation}
    danger={isPendingCancellation}
  />
  <InfoRow
    label="Cena"
    value={`${price.toFixed(2)} zł / ${cycle === "yearly" ? "rok" : "mies."}`}
  />
  <InfoRow
    label="Najbliższa płatność zbiorcza"
    value={isPendingCancellation ? "Brak" : nextBillingStr}
    muted={isPendingCancellation}
  />
</View>

        {/* Nowości */}
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", paddingHorizontal: 2 }}>
            Nowości na {providerName}
          </Text>

          {moviesLoading ? (
            <ActivityIndicator color="#000" style={{ marginVertical: 16 }} />
          ) : movies.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={movies}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 2 }}
renderItem={({ item }) => (
                <Pressable
                  onPress={() => router.push({
                    pathname: "/titles/[tmdbId]",
                    params: { tmdbId: String(item.id), mediaType: "movie" },
                  } as any)}
                  style={{
                    width: 120,
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    overflow: "hidden",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.07,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  {item.posterUrl ? (
                    <Image
                      source={{ uri: item.posterUrl }}
                      style={{ width: 120, height: 170, resizeMode: "cover" }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 120,
                        height: 170,
                        backgroundColor: "#f0f0f0",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 32 }}>🎬</Text>
                    </View>
                  )}

                  <View style={{ padding: 8, height: 70, justifyContent: "space-between" }}>
                    <View style={{ flex: 1, justifyContent: "center" }}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#000",
                          textAlign: "center",
                        }}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 10, color: "#999" }}>{item.year}</Text>

                      {item.rating && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <MaterialIcons name="star-border" size={12} color="#999" />
                          <Text style={{ fontSize: 10, color: "#999", fontWeight: "600" }}>
                            {item.rating}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              )}
            />
          ) : (
            <Text style={{ color: "#999", fontSize: 13, paddingHorizontal: 2 }}>
              Brak dostępnych tytułów
            </Text>
          )}
        </View>

        {/* Akcje (tylko gdy nie wygasa) */}
        {!isPendingCancellation && (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Pressable
              onPress={handleOpenChangePlan}
              style={{
                paddingVertical: 16,
                paddingHorizontal: 16,
                backgroundColor: "#000",
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontWeight: "800", fontSize: 15, color: "#fff" }}>
                Zmień plan
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowCancelConfirm(true)}
              style={{
                paddingVertical: 16,
                paddingHorizontal: 16,
                backgroundColor: "#fff",
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: "#fca5a5",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#dc2626", fontWeight: "800", fontSize: 15 }}>
                Anuluj subskrypcję
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* MODAL: Reaktywacja */}
      <AnimatedSheetModal
        visible={showReactivateConfirm}
        onClose={() => setShowReactivateConfirm(false)}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 6 }}>
            Aktywować subskrypcję {providerName}?
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: "#666",
              lineHeight: 18,
              marginBottom: 14,
            }}
          >
            Subskrypcja zostanie ponownie aktywowana. Dostęp pozostanie bez przerwy.
          </Text>

          <View style={{ gap: 12, marginBottom: 20 }}>
            <View
              style={{
                padding: 16,
                backgroundColor: "#fff",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#eee",
                gap: 10,
              }}
            >
              <InfoRow label="Najbliższe odnowienie" value={nextRenewalStr} highlight />
              <InfoRow
                label="Kwota"
                value={`${price.toFixed(2)} zł / ${cycle === "yearly" ? "rok" : "mies."}`}
              />
            </View>

            <View
              style={{
                padding: 12,
                backgroundColor: "#f5f5f5",
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#eee",
              }}
            >
              <Text style={{ fontSize: 12, color: "#666", lineHeight: 18 }}>
                Opłata zostanie doliczona do najbliższej płatności: {nextBillingStr}.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleReactivateConfirm}
            style={{
              padding: 18,
              backgroundColor: "#000",
              borderRadius: 14,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: "#fff",
                textAlign: "center",
                fontWeight: "800",
                fontSize: 16,
              }}
            >
              Aktywuj subskrypcję
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowReactivateConfirm(false)}
            style={{
              padding: 14,
              backgroundColor: "#f0f0f0",
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ fontWeight: "700", color: "#333" }}>Anuluj</Text>
          </Pressable>
        </View>
      </AnimatedSheetModal>

      {/* MODAL: Rezygnacja */}
      <AnimatedSheetModal
        visible={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "800", marginBottom: 6 }}>
            Czy na pewno chcesz zrezygnować z {providerName}?
          </Text>

          <Text style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
            {subscription?.plan?.planName} · {price.toFixed(2)} zł/
            {cycle === "yearly" ? "rok" : "mies."}
          </Text>

          <View
            style={{
              padding: 16,
              backgroundColor: "#f5f5f5",
              borderRadius: 12,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "#eee",
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 13, color: "#333", lineHeight: 18 }}>
              Dostęp pozostanie aktywny do{" "}
              <Text style={{ fontWeight: "800" }}>{accessUntilStr}</Text>.
            </Text>

            <Text style={{ fontSize: 13, color: "#333", lineHeight: 18 }}>
              Po tej dacie subskrypcja wygaśnie automatycznie.
            </Text>

            <Text style={{ fontSize: 13, color: "#333", lineHeight: 18 }}>
              Opłata za kolejny okres nie zostanie pobrana.
            </Text>
          </View>

          <Pressable
            onPress={handleCancelSubscription}
            style={{
              padding: 18,
              backgroundColor: "#dc2626",
              borderRadius: 14,
              marginBottom: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                textAlign: "center",
                fontWeight: "800",
                fontSize: 16,
              }}
            >
              Potwierdź rezygnację
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowCancelConfirm(false)}
            style={{
              padding: 14,
              backgroundColor: "#f0f0f0",
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontWeight: "700", color: "#333" }}>Anuluj</Text>
          </Pressable>
        </View>
      </AnimatedSheetModal>
    </View>
  );
}

/**
 * Prosty wiersz etykieta → wartość
 * highlight: pogrubia wartość (np. ważna data)
 */
function InfoRow({
  label,
  value,
  highlight,
  danger,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
  muted?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 14, color: "#666" }}>{label}</Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: highlight ? "800" : "600",
          color: danger ? "#dc2626" : muted ? "#aaa" : highlight ? "#000" : "#333",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function InfoRowTransition({
  label,
  oldValue,
  newValue,
  changed,
}: {
  label: string;
  oldValue: string;
  newValue: string;
  changed: boolean;
}) {
  if (!changed) {
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, color: "#666" }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#333" }}>
          {oldValue}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 14, color: "#666" }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text
          style={{
            fontSize: 14,
            color: "#aaa",
            textDecorationLine: "line-through",
          }}
        >
          {oldValue}
        </Text>
        <Text style={{ fontSize: 13, color: "#aaa" }}>→</Text>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#1d4ed8" }}>
          {newValue}
        </Text>
      </View>
    </View>
  );
}