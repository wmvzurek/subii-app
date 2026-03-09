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
import { Ionicons } from "@expo/vector-icons";
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

function AnimatedSheetModal({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(visible);
  const backdropOpacity = useState(() => new Animated.Value(0))[0];
  const sheetTranslateY = useState(() => new Animated.Value(24))[0];

  useEffect(() => {
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
        onClose();
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
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: "rgba(0,0,0,0.5)", opacity: backdropOpacity },
          ]}
        />
        <Pressable style={{ flex: 1 }} onPress={closeWithAnimation} />
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function SubscriptionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

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
  const SHADOW = "#000";
  const DANGER = "#dc2626";
  const DANGER_BG = "rgba(239,68,68,0.12)";
  const DANGER_BORDER = "rgba(239,68,68,0.4)";
  const BLUE = "#2563eb";
  const BLUE_BG = "rgba(59,130,246,0.12)";
  const BLUE_BORDER = "rgba(59,130,246,0.4)";
  const BLUE_DARK = "#1d4ed8";
  const BLUE_LIGHT_BG = "#eff6ff";
  const BLUE_LIGHT_BORDER = "#bfdbfe";
  const SUCCESS_BG = "rgba(134,239,172,0.2)";
  const SUCCESS_BORDER = "rgba(134,239,172,0.4)";
  const SUCCESS_TEXT = "#16a34a";
  const CANCEL_BG = "#fff5f5";
  const CANCEL_BORDER = "#fecaca";
  const CANCEL_ICON = "#eb3c3c";

  const FONT_REGULAR = "Inter_400Regular";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";
  const FONT_EXTRABOLD = "Inter_800ExtraBold";

  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
  const [movies, setMovies] = useState<any[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(false);

  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const loadData = async () => {
    try {
      const { storage } = await import("../src/lib/storage");
      const savedUser = await storage.getUser();
      setUser(savedUser);

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
      loadMovies(found.providerCode);
    } catch {
      Alert.alert("Sprawdź połączenie z internetem i spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleOpenChangePlan = () => {
    router.push(
      `/subscriptions-select-plan?provider=${subscription.providerCode}` as any
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={BLACK} />
      </View>
    );
  }

  if (!subscription) return null;

  const logo = getProviderLogo(subscription.providerCode);
  const providerName = getProviderName(subscription.providerCode);
  const cycle = subscription.plan?.cycle || "monthly";
  const isPendingChange = subscription.status === "pending_change";
  const isPendingCancellation = subscription.status === "pending_cancellation";

  const price =
    isPendingChange && subscription.pendingPlan
      ? subscription.pendingPlan.pricePLN
      : subscription.priceOverridePLN || subscription.plan?.pricePLN || 0;

  const nextRenewalStr = subscription.nextRenewalDate
    ? new Date(subscription.nextRenewalDate).toLocaleDateString("pl-PL")
    : "—";
  const nextBillingStr = getNextBillingDateStr(
    user?.billingDay,
    subscription?.nextRenewalDate
  );

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

  const accessUntilStr = subscription.activeUntil
    ? new Date(subscription.activeUntil).toLocaleDateString("pl-PL")
    : nextRenewalStr;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 20,
          paddingHorizontal: 20,
          backgroundColor: WHITE,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ marginBottom: -5 }}>
          <Text style={{ fontSize: 28, fontFamily: FONT_REGULAR }}>←</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          {logo && (
            <Image
              source={logo}
              style={{ width: 64, height: 64, resizeMode: "contain" }}
            />
          )}

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontFamily: FONT_SEMI, color: BLACK }}>
              {providerName}
            </Text>
            <Text style={{ fontSize: 12, color: MUTED, fontFamily: FONT_REGULAR }}>
              {subscription.plan?.planName}
            </Text>
          </View>

          <View
            style={{
              width: 100,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: isPendingCancellation
                ? DANGER_BG
                : isPendingChange
                ? BLUE_BG
                : SUCCESS_BG,
              borderWidth: 1,
              borderColor: isPendingCancellation
                ? DANGER_BORDER
                : isPendingChange
                ? BLUE_BORDER
                : SUCCESS_BORDER,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontFamily: FONT_EXTRABOLD,
                color: isPendingCancellation
                  ? DANGER
                  : isPendingChange
                  ? BLUE
                  : SUCCESS_TEXT,
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

      {isPendingCancellation && (
        <Pressable
          onPress={() => setShowReactivateConfirm(true)}
          style={({ pressed }) => ({
            backgroundColor: CANCEL_BG,
            paddingVertical: 14,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderWidth: 1,
            borderColor: CANCEL_BORDER,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Ionicons name="close-circle-outline" size={30} color={CANCEL_ICON} />

          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 14, fontFamily: FONT_BOLD, color: DANGER }}>
              Subskrypcja została anulowana
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: FONT_REGULAR,
                color: DANGER,
                lineHeight: 16,
              }}
            >
              Dostęp wygaśnie{" "}
              <Text style={{ fontFamily: FONT_BOLD }}>{accessUntilStr}</Text>
            </Text>
            <Text style={{ fontSize: 13, fontFamily: FONT_SEMI, color: DANGER }}>
              Naciśnij, aby ponownie włączyć subskrypcję
            </Text>
          </View>
        </Pressable>
      )}

      {isPendingChange && subscription.pendingPlan && (
        <View
          style={{
            backgroundColor: BLUE_LIGHT_BG,
            paddingVertical: 14,
            paddingHorizontal: 20,
            gap: 4,
            borderWidth: 1,
            borderColor: BLUE_LIGHT_BORDER,
          }}
        >
          <Text style={{ fontSize: 14, fontFamily: FONT_BOLD, color: BLUE_DARK }}>
            Zmiana planu w toku
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontFamily: FONT_REGULAR,
              color: BLUE_DARK,
              lineHeight: 20,
            }}
          >
            {subscription.plan?.planName} → {subscription.pendingPlan.planName}
          </Text>
          <InfoRow label="Obecny plan do" value={nextRenewalStr} highlight />
          <InfoRow
            label="Nowa cena od następnego okresu"
            value={`${subscription.pendingPlan.pricePLN?.toFixed(2)} zł / ${
              cycle === "yearly" ? "rok" : "mies."
            }`}
          />
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      >
        <View
          style={{
            backgroundColor: WHITE,
            borderRadius: 12,
            padding: 20,
            gap: 8,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: FONT_BOLD,
              color: BLACK,
              marginBottom: 4,
            }}
          >
            Szczegóły planu
          </Text>

          {isPendingChange && pendingPlan ? (
            <>
              <InfoRowTransition
                label="Cena"
                oldValue={`${oldPrice.toFixed(2)} zł / ${
                  oldCycle === "yearly" ? "rok" : "mies."
                }`}
                newValue={`${newPrice.toFixed(2)} zł / ${
                  newCycle === "yearly" ? "rok" : "mies."
                }`}
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
                oldValue={oldCycle === "yearly" ? "Roczny" : "Miesięczny"}
                newValue={newCycle === "yearly" ? "Roczny" : "Miesięczny"}
                changed={oldCycle !== newCycle}
              />
            </>
          ) : (
            <>
              <InfoRow
                label="Cena"
                value={`${price.toFixed(2)} zł / ${
                  cycle === "yearly" ? "rok" : "mies."
                }`}
              />
              <InfoRow
                label="Ekrany"
                value={String(subscription.plan?.screens ?? "—")}
              />
              <InfoRow
                label="Jakość"
                value={subscription.plan?.uhd ? "4K Ultra HD" : "HD"}
              />
              <InfoRow
                label="Reklamy"
                value={subscription.plan?.ads ? "Tak" : "Nie"}
              />
              <InfoRow
                label="Typ cyklu"
                value={cycle === "yearly" ? "Roczna" : "Miesięczna"}
              />
            </>
          )}
        </View>

        <View
          style={{
            backgroundColor: WHITE,
            borderRadius: 12,
            padding: 20,
            gap: 8,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: FONT_BOLD,
              color: BLACK,
              marginBottom: 4,
            }}
          >
            Rozliczenie
          </Text>
          <InfoRow
            label="Aktywna od"
            value={new Date(subscription.createdAt).toLocaleDateString("pl-PL")}
          />
          <InfoRow
            label={
              cycle === "yearly"
                ? "Następne odnowienie (roczne)"
                : "Następne odnowienie"
            }
            value={isPendingCancellation ? "Anulowana" : nextRenewalStr}
            highlight={!isPendingCancellation}
            danger={isPendingCancellation}
          />
          <InfoRow
            label="Cena"
            value={`${price.toFixed(2)} zł / ${
              cycle === "yearly" ? "rok" : "mies."
            }`}
          />
          <InfoRow
            label="Najbliższa płatność zbiorcza"
            value={isPendingCancellation ? "Brak" : nextBillingStr}
            muted={isPendingCancellation}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 16,
              fontFamily: FONT_BOLD,
              color: BLACK,
              paddingHorizontal: 2,
            }}
          >
            Nowości na {providerName}
          </Text>

          {moviesLoading ? (
            <ActivityIndicator color={BLACK} style={{ marginVertical: 16 }} />
          ) : movies.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={movies}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/titles/[tmdbId]",
                      params: { tmdbId: String(item.id), mediaType: "movie" },
                    } as any)
                  }
                  style={{
                    width: 120,
                    backgroundColor: WHITE,
                    borderRadius: 12,
                    overflow: "hidden",
                    shadowColor: SHADOW,
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
                        backgroundColor: LIGHT_BG,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="film-outline" size={36} color={SUBTLE} />
                    </View>
                  )}

                  <View
                    style={{
                      padding: 8,
                      height: 70,
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, justifyContent: "center" }}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: FONT_BOLD,
                          color: BLACK,
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
                      <Text
                        style={{
                          fontSize: 10,
                          fontFamily: FONT_REGULAR,
                          color: SUBTLE,
                        }}
                      >
                        {item.year}
                      </Text>

                      {item.rating && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <MaterialIcons name="star" size={12} color={SUBTLE} />
                          <Text
                            style={{
                              fontSize: 10,
                              color: SUBTLE,
                              fontFamily: FONT_SEMI,
                            }}
                          >
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
            <Text
              style={{
                color: SUBTLE,
                fontSize: 13,
                paddingHorizontal: 2,
                fontFamily: FONT_REGULAR,
              }}
            >
              Brak dostępnych tytułów
            </Text>
          )}
        </View>

        {!isPendingCancellation && (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Pressable
              onPress={handleOpenChangePlan}
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
                style={{ fontFamily: FONT_BOLD, fontSize: 15, color: WHITE }}
              >
                Zmień plan
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowCancelConfirm(true)}
              style={{
                paddingVertical: 14,
                backgroundColor: LIGHT_BG,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{ color: "#333", fontFamily: FONT_BOLD, fontSize: 14 }}
              >
                Anuluj subskrypcję
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <AnimatedSheetModal
        visible={showReactivateConfirm}
        onClose={() => setShowReactivateConfirm(false)}
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
            Aktywować subskrypcję {providerName}?
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: MUTED,
              marginBottom: 16,
              fontFamily: FONT_REGULAR,
            }}
          >
            Subskrypcja zostanie ponownie aktywowana. Dostęp pozostanie bez
            przerwy.
          </Text>

          <View style={{ gap: 12, marginBottom: 20 }}>
            <View
              style={{
                padding: 16,
                backgroundColor: WHITE,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: BORDER,
                gap: 10,
              }}
            >
              <InfoRow
                label="Najbliższe odnowienie"
                value={nextRenewalStr}
                highlight
              />
              <InfoRow
                label="Kwota"
                value={`${price.toFixed(2)} zł / ${
                  cycle === "yearly" ? "rok" : "mies."
                }`}
              />
            </View>

            <View
              style={{
                padding: 12,
                backgroundColor: BG,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: BORDER,
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
                Opłata zostanie doliczona do najbliższej płatności:{" "}
                {nextBillingStr}.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleReactivateConfirm}
            style={{
              paddingVertical: 16,
              backgroundColor: BLACK,
              borderRadius: 12,
              marginBottom: 12,
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
              Aktywuj subskrypcję
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowReactivateConfirm(false)}
            style={{
              paddingVertical: 14,
              backgroundColor: LIGHT_BG,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: FONT_BOLD, color: "#333", fontSize: 14 }}>
              Anuluj
            </Text>
          </Pressable>
        </View>
      </AnimatedSheetModal>

      <AnimatedSheetModal
        visible={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
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
            {subscription?.plan?.planName} · {price.toFixed(2)} zł/
            {cycle === "yearly" ? "rok" : "mies."}
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
              <Text style={{ fontFamily: FONT_EXTRABOLD }}>{accessUntilStr} </Text>.
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
            <Text style={{ fontFamily: FONT_BOLD, color: "#333", fontSize: 14 }}>
              Anuluj
            </Text>
          </Pressable>
        </View>
      </AnimatedSheetModal>
    </View>
  );
}

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
  const FONT_REGULAR = "Inter_400Regular";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_EXTRABOLD = "Inter_800ExtraBold";

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 14, color: "#666", fontFamily: FONT_REGULAR }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontFamily: highlight ? FONT_EXTRABOLD : FONT_SEMI,
          color: danger
            ? "#dc2626"
            : muted
            ? "#aaa"
            : highlight
            ? "#252729"
            : "#333",
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
  const FONT_REGULAR = "Inter_400Regular";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";

  if (!changed) {
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 14, color: "#666", fontFamily: FONT_REGULAR }}>
          {label}
        </Text>
        <Text style={{ fontSize: 14, fontFamily: FONT_SEMI, color: "#333" }}>
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
      <Text style={{ fontSize: 14, color: "#666", fontFamily: FONT_REGULAR }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text
          style={{
            fontSize: 14,
            color: "#aaa",
            textDecorationLine: "line-through",
            fontFamily: FONT_REGULAR,
          }}
        >
          {oldValue}
        </Text>
        <Text style={{ fontSize: 13, color: "#aaa", fontFamily: FONT_REGULAR }}>
          →
        </Text>
        <Text style={{ fontSize: 14, fontFamily: FONT_BOLD, color: "#1d4ed8" }}>
          {newValue}
        </Text>
      </View>
    </View>
  );
}