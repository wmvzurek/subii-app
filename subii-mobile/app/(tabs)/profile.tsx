import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  Animated,
  Easing,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { storage } from "../../src/lib/storage";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStripe, CardField, CardFieldInput } from "@stripe/stripe-react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import TermsModal from "../TermsModal";
import HelpModal from "../HelpModal";
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
  const sheetTranslateY = useState(() => new Animated.Value(300))[0];

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
          toValue: 300,
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
        toValue: 300,
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const PosterCard = React.memo(
  ({
    item,
    mediaType,
    onPress,
  }: {
    item: any;
    mediaType: "movie" | "tv";
    onPress: () => void;
  }) => {
    const FONT_SEMI = "Inter_600SemiBold";
    const FONT_REGULAR = "Inter_400Regular";

    return (
      <Pressable onPress={onPress} style={{ width: 110 }}>
        {item.posterUrl ? (
          <Image
            source={{ uri: item.posterUrl }}
            style={{ width: 110, height: 165, borderRadius: 10 }}
          />
        ) : (
          <View
            style={{
              width: 110,
              height: 165,
              borderRadius: 10,
              backgroundColor: "#f0f0f0",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 32 }}>
              {mediaType === "movie" ? "🎬" : "📺"}
            </Text>
          </View>
        )}
        <Text
          style={{
            fontSize: 12,
            fontFamily: FONT_SEMI,
            color: "#252729",
            marginTop: 6,
          }}
          numberOfLines={2}
        >
          {item.titlePL}
        </Text>
        {mediaType === "tv" &&
          item.totalEpisodes > 0 &&
          item.status === "in_progress" && (
            <Text
              style={{
                fontSize: 11,
                color: "#999",
                marginTop: 2,
                fontFamily: FONT_REGULAR,
              }}
            >
              {item.watchedEpisodes}/{item.totalEpisodes} odc.
            </Text>
          )}
      </Pressable>
    );
  }
);

export default function Profile() {
  const router = useRouter();
  const { logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

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
  const PLACEHOLDER = "#9a9a9a";
  const BORDER = "#ddd";
  const INPUT_BG = "#f9f9f9";
  const LIGHT_BG = "#f0f0f0";
  const SUBTLE = "#999";
  const DIVIDER = "#e5e5e5";
  const SUCCESS = "#22c55e";
  const WARNING = "#f59e0b";
  const DANGER = "#dc2626";
  const ICON_MUTED = "#ccc";
  const SHADOW = "#000";

  const FONT_LIGHT = "Inter_300Light";
  const FONT_REGULAR = "Inter_400Regular";
  const FONT_MEDIUM = "Inter_500Medium";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";
  const FONT_EXTRABOLD = "Inter_800ExtraBold";

  const inputStyle = {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: INPUT_BG,
    fontFamily: FONT_REGULAR,
    color: BLACK,
  } as const;

  const labelStyle = {
    fontSize: 12,
    color: SUBTLE,
    fontFamily: FONT_SEMI,
    marginBottom: 6,
  } as const;

  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"movies" | "series">("movies");
  const [watchedData, setWatchedData] = useState<{
    movies: {
      tmdbId: number;
      titlePL: string;
      posterUrl: string | null;
      year: number | null;
      favorite: boolean;
      watched: boolean;
      rating: number | null;
    }[];
    series: {
      tmdbId: number;
      titlePL: string;
      posterUrl: string | null;
      year: number | null;
      favorite: boolean;
      status: "completed" | "in_progress" | "favorite_only";
      watchedEpisodes: number;
      totalEpisodes: number;
      rating: number | null;
    }[];
  } | null>(null);
  const [watchStats, setWatchStats] = useState<{
    movies: { minutes: number; count: number };
    series: { minutes: number; episodeCount: number };
  } | null>(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [newPhone, setNewPhone] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const [showCardForm, setShowCardForm] = useState(false);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [cardPassword, setCardPassword] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [savedCard, setSavedCard] = useState<{
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null>(null);
  const { confirmSetupIntent } = useStripe();

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const formatTime = (minutes: number): string => {
    if (minutes === 0) return "0 min";
    const days = Math.floor(minutes / (60 * 24));
    const hours = Math.floor((minutes % (60 * 24)) / 60);
    const mins = minutes % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}min`;
    return `${mins}min`;
  };

  const loadUser = async () => {
    try {
      await refreshUser();
      const freshUser = await storage.getUser();
      setUser(freshUser);
      try {
        const cardRes = await api.get("/api/stripe/card");
        if (cardRes.data.card) setSavedCard(cardRes.data.card);
      } catch {}
      try {
        const stats = await api.get("/api/user-stats");
        setWatchStats(stats.data);
        const watched = await api.get("/api/user-watched");
        setWatchedData(watched.data);
      } catch {}
    } catch {
      const savedUser = await storage.getUser();
      setUser(savedUser);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUser();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("Wylogować się?", "Czy na pewno chcesz się wylogować?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Wyloguj",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert("Błąd", "Podaj hasło aby potwierdzić usunięcie konta");
      return;
    }
    setDeletingAccount(true);
    try {
      await api.post("/api/auth/delete-account", { password: deletePassword });
      setShowDeleteAccount(false);
      await logout();
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się usunąć konta");
    } finally {
      setDeletingAccount(false);
    }
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Brak uprawnień",
        "Zezwól aplikacji na dostęp do galerii w ustawieniach."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0])
      setProfileImage(result.assets[0].uri);
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    if (!emailPassword.trim()) {
      Alert.alert("Błąd", "Podaj swoje hasło aby zmienić email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      Alert.alert("Błąd", "Podaj prawidłowy adres email");
      return;
    }
    setSavingEmail(true);
    try {
      await api.post("/api/auth/change-email", {
        newEmail: newEmail.trim().toLowerCase(),
        currentPassword: emailPassword,
      });
      Alert.alert("Gotowe!", "Wysłaliśmy link weryfikacyjny na nowy adres e-mail.");
      setShowEmailModal(false);
      setEmailPassword("");
      setNewEmail("");
    } catch (e: any) {
      Alert.alert(
        "Błąd",
        e.response?.data?.error || "Nie udało się zmienić emaila"
      );
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert("Błąd", "Podaj obecne hasło");
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert("Błąd", "Podaj nowe hasło");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Błąd", "Hasła nie są takie same");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Błąd", "Hasło musi mieć min. 8 znaków");
      return;
    }
    setSavingPassword(true);
    try {
      await api.post("/api/auth/change-password", { currentPassword, newPassword });
      Alert.alert("Gotowe!", "Hasło zostało zmienione.");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      Alert.alert(
        "Błąd",
        e.response?.data?.error || "Nie udało się zmienić hasła"
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleChangePhone = async () => {
    if (!newPhone.trim()) return;
    if (!phonePassword.trim()) {
      Alert.alert("Błąd", "Podaj hasło aby zmienić numer telefonu");
      return;
    }
    setSavingPhone(true);
    try {
      await api.post("/api/auth/change-phone", {
        phone: newPhone.trim(),
        currentPassword: phonePassword,
      });
      const updatedUser = { ...user, phone: newPhone.trim() };
      setUser(updatedUser);
      await storage.setUser(updatedUser);
      Alert.alert("Gotowe!", "Numer telefonu został zaktualizowany.");
      setShowPhoneModal(false);
      setNewPhone("");
      setPhonePassword("");
    } catch (e: any) {
      Alert.alert(
        "Błąd",
        e.response?.data?.error || "Nie udało się zmienić numeru"
      );
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSaveCard = async () => {
    if (!cardDetails?.complete) {
      Alert.alert("Błąd", "Uzupełnij wszystkie dane karty");
      return;
    }
    setSavingCard(true);
    try {
      const res = await api.post("/api/stripe/setup-intent");
      const { setupIntent, error } = await confirmSetupIntent(
        res.data.clientSecret,
        { paymentMethodType: "Card" }
      );
      if (error) {
        Alert.alert("Błąd", error.message);
        return;
      }
      await api.post("/api/stripe/save-payment-method", {
        paymentMethodId: setupIntent!.paymentMethodId,
      });
      const cardRes = await api.get("/api/stripe/card");
      if (cardRes.data.card) setSavedCard(cardRes.data.card);
      setShowCardForm(false);
      setShowCardModal(false);
      setCardPassword("");
      Alert.alert("Gotowe!", "Karta została zapisana pomyślnie.");
    } catch (e: any) {
      Alert.alert(
        "Błąd",
        e.response?.data?.error || "Nie udało się zapisać karty"
      );
    } finally {
      setSavingCard(false);
    }
  };

  const HorizontalSection = useCallback(
    ({
      title,
      items,
      mediaType,
      filter,
      emptyText,
    }: {
      title: string;
      items: any[];
      mediaType: "movie" | "tv";
      filter: string;
      emptyText: string;
    }) => (
      <View style={{ gap: 12 }}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/watched-list",
              params: {
                type: mediaType === "movie" ? "movies" : "series",
                filter,
              },
            } as any)
          }
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{ fontSize: 16, fontFamily: FONT_BOLD, color: BLACK }}
          >
            {title}
          </Text>
          {items.length > 0 && (
            <Text style={{ fontSize: 12, color: MUTED, fontFamily: FONT_SEMI }}>
              Wszystkie
            </Text>
          )}
        </Pressable>
        {items.length === 0 ? (
          <Text style={{ fontSize: 14, color: ICON_MUTED, fontFamily: FONT_REGULAR }}>
            {emptyText}
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {items.map((item) => (
              <PosterCard
                key={item.tmdbId}
                item={item}
                mediaType={mediaType}
                onPress={() =>
                  router.push({
                    pathname: "/titles/[tmdbId]",
                    params: { tmdbId: item.tmdbId, mediaType },
                  } as any)
                }
              />
            ))}
          </ScrollView>
        )}
      </View>
    ),
    [router]
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      <View
        style={{
          backgroundColor: WHITE,
          paddingTop: insets.top,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable onPress={handlePickImage}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#e8e8e8",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={{ width: 60, height: 60, borderRadius: 32 }}
                />
              ) : (
                <Ionicons name="person" size={40} color={SUBTLE} />
              )}
            </View>
          </Pressable>
          <View>
            <Text
              style={{
                fontSize: 25,
                fontFamily: FONT_SEMI,
                color: BLACK,
              }}
            >
              {user?.firstName} {user?.lastName}
            </Text>
            <Text
              style={{ fontSize: 14, color: MUTED, marginTop: 2, fontFamily: FONT_REGULAR }}
            >
              {user?.email}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setShowSettingsModal(true)}
          style={{ padding: 8 }}
        >
          <MaterialIcons name="settings" size={25} color={BLACK} />
        </Pressable>
      </View>

      <Modal
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: BG }}>
          <View
            style={{
              padding: 20,
              paddingTop: insets.top - 15,
              backgroundColor: WHITE,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Pressable onPress={() => setShowSettingsModal(false)}>
                <Text style={{ fontSize: 24, fontFamily: FONT_REGULAR }}>←</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 24, fontFamily: FONT_SEMI, color: BLACK }}>
                  Ustawienia
                </Text>
              </View>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}>

            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 14,
                padding: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 20,
              }}
            >
              <View
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  backgroundColor: LIGHT_BG,
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={{ width: 70, height: 70, borderRadius: 35 }}
                  />
                ) : (
                  <Ionicons name="person" size={40} color={SUBTLE} />
                )}
              </View>
              <Pressable
                onPress={handlePickImage}
                style={{
                  marginLeft: 80,
                  backgroundColor: BLACK,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: WHITE, fontFamily: FONT_BOLD, fontSize: 14 }}>
                  Zmień zdjęcie
                </Text>
              </Pressable>
            </View>

            <View
              style={{ backgroundColor: WHITE, borderRadius: 14, padding: 20 }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: SUBTLE,
                  fontFamily: FONT_REGULAR,
                  marginBottom: 4,
                }}
              >
                IMIĘ I NAZWISKO
              </Text>
              <Text style={{ fontSize: 16, fontFamily: FONT_SEMI, color: BLACK }}>
                {user?.firstName} {user?.lastName}
              </Text>
            </View>

            <Pressable
              onPress={() => setShowEmailModal(true)}
              style={{
                backgroundColor: WHITE,
                borderRadius: 14,
                padding: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: SUBTLE,
                    fontFamily: FONT_REGULAR,
                    marginBottom: 4,
                  }}
                >
                  ADRES E-MAIL
                </Text>
                <Text style={{ fontSize: 16, fontFamily: FONT_SEMI, color: BLACK }}>
                  {user?.email}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    marginTop: 3,
                    color: user?.emailVerified ? SUCCESS : WARNING,
                    fontFamily: FONT_SEMI,
                  }}
                >
                  {user?.emailVerified ? "Zweryfikowany" : "Niezweryfikowany"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={ICON_MUTED} />
            </Pressable>

            <Pressable
              onPress={() => setShowPasswordModal(true)}
              style={{
                backgroundColor: WHITE,
                borderRadius: 14,
                padding: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: SUBTLE,
                    fontFamily: FONT_REGULAR,
                    marginBottom: 4,
                  }}
                >
                  HASŁO
                </Text>
                <Text style={{ fontSize: 16, fontFamily: FONT_SEMI, color: BLACK }}>
                  ••••••••
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={ICON_MUTED} />
            </Pressable>

            <Pressable
              onPress={() => setShowPhoneModal(true)}
              style={{
                backgroundColor: WHITE,
                borderRadius: 14,
                padding: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: SUBTLE,
                    fontFamily: FONT_REGULAR,
                    marginBottom: 4,
                  }}
                >
                  NUMER TELEFONU
                </Text>
                <Text style={{ fontSize: 16, fontFamily: FONT_SEMI, color: BLACK }}>
                  {user?.phone || "Nie podano"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={ICON_MUTED} />
            </Pressable>

            <Pressable
              onPress={() => setShowCardModal(true)}
              style={{
                backgroundColor: WHITE,
                borderRadius: 14,
                padding: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: SUBTLE,
                    fontFamily: FONT_REGULAR,
                    marginBottom: 4,
                  }}
                >
                  METODA PŁATNOŚCI
                </Text>
                {savedCard ? (
                  <Text style={{ fontSize: 16, fontFamily: FONT_SEMI, color: BLACK }}>
                    {savedCard.brand.toUpperCase()} •••• {savedCard.last4}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 16, fontFamily: FONT_SEMI, color: BLACK }}>
                    Nie dodano karty
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={ICON_MUTED} />
            </Pressable>

            <View
              style={{ backgroundColor: WHITE, borderRadius: 14, padding: 20 }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: SUBTLE,
                  fontFamily: FONT_REGULAR,
                  marginBottom: 4,
                }}
              >
                DATA URODZENIA
              </Text>
              <Text style={{ fontSize: 16, fontFamily: FONT_SEMI, color: BLACK }}>
                {user?.dateOfBirth
                  ? new Date(user.dateOfBirth).toLocaleDateString("pl-PL")
                  : "—"}
              </Text>
            </View>

            <Pressable
              onPress={() => setShowTermsModal(true)}
              style={{
                backgroundColor: WHITE,
                borderRadius: 14,
                padding: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 16, fontFamily: FONT_SEMI, color: BLACK }}>
                Regulamin i prywatność
              </Text>
              <Ionicons name="chevron-forward" size={20} color={ICON_MUTED} />
            </Pressable>

            <Pressable
              onPress={() => setShowHelpModal(true)}
              style={{
                backgroundColor: WHITE,
                borderRadius: 14,
                padding: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 16, fontFamily: FONT_SEMI, color: BLACK }}>
                Centrum pomocy
              </Text>
              <Ionicons name="chevron-forward" size={20} color={ICON_MUTED} />
            </Pressable>

            <Pressable
              onPress={() => {
                setShowSettingsModal(false);
                handleLogout();
              }}
              style={{
                paddingVertical: 16,
                backgroundColor: DANGER,
                borderRadius: 12,
                marginBottom: 0,
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
                Wyloguj się
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowDeleteAccount(true)}
              style={{
                padding: 14,
                backgroundColor: LIGHT_BG,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: FONT_BOLD, color: "#333", fontSize: 14 }}>
                Usuń konto
              </Text>
            </Pressable>
          </ScrollView>

          <AnimatedSheetModal
            visible={showEmailModal}
            onClose={() => {
              setShowEmailModal(false);
              setNewEmail("");
              setEmailPassword("");
            }}
          >
            <View
              style={{
                backgroundColor: WHITE,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontFamily: FONT_SEMI,
                    color: BLACK,
                  }}
                >
                  Zmień adres e-mail
                </Text>
                <Pressable
                  onPress={() => {
                    setShowEmailModal(false);
                    setNewEmail("");
                    setEmailPassword("");
                  }}
                >
                  <Ionicons name="close" size={24} color={BLACK} />
                </Pressable>
              </View>
              <View style={{ gap: 12 }}>
                <TextInput
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="Nowy adres e-mail"
                  placeholderTextColor={PLACEHOLDER}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    borderWidth: 1,
                    borderColor: BORDER,
                    borderRadius: 10,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    fontSize: 14,
                    backgroundColor: INPUT_BG,
                    color: BLACK,
                    fontFamily: FONT_LIGHT,
                  }}
                />
                <TextInput
                  placeholder="Obecne hasło"
                  placeholderTextColor={PLACEHOLDER}
                  secureTextEntry
                  value={emailPassword}
                  onChangeText={setEmailPassword}
                  autoCapitalize="none"
                  style={{
                    borderWidth: 1,
                    borderColor: BORDER,
                    borderRadius: 10,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    fontSize: 14,
                    backgroundColor: INPUT_BG,
                    color: BLACK,
                    fontFamily: FONT_LIGHT,
                  }}
                />
                <Pressable
                  onPress={handleChangeEmail}
                  disabled={savingEmail}
                  style={{
                    backgroundColor: BLACK,
                    paddingVertical: 16,
                    borderRadius: 12,
                    marginTop: 6,
                    alignItems: "center",
                    opacity: savingEmail ? 0.6 : 1,
                  }}
                >
                  {savingEmail ? (
                    <ActivityIndicator color={WHITE} size="small" />
                  ) : (
                    <Text style={{ color: WHITE, fontFamily: FONT_BOLD, fontSize: 15 }}>
                      Zatwierdź
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </AnimatedSheetModal>

          <AnimatedSheetModal
            visible={showPasswordModal}
            onClose={() => {
              setShowPasswordModal(false);
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            }}
          >
            <View
              style={{
                backgroundColor: WHITE,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 18, fontFamily: FONT_EXTRABOLD, color: BLACK }}>
                  Zmień hasło
                </Text>
                <Pressable
                  onPress={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  <Ionicons name="close" size={24} color={BLACK} />
                </Pressable>
              </View>
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={labelStyle}>OBECNE HASŁO</Text>
                  <TextInput
                    placeholder="Wpisz obecne hasło"
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    style={inputStyle}
                  />
                </View>
                <View>
                  <Text style={labelStyle}>NOWE HASŁO</Text>
                  <TextInput
                    placeholder="Wpisz nowe hasło"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                    style={inputStyle}
                  />
                </View>
                <View>
                  <Text style={labelStyle}>POTWIERDŹ NOWE HASŁO</Text>
                  <TextInput
                    placeholder="Powtórz nowe hasło"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    style={inputStyle}
                  />
                </View>
                <Pressable
                  onPress={handleChangePassword}
                  disabled={savingPassword}
                  style={{
                    backgroundColor: BLACK,
                    padding: 16,
                    borderRadius: 14,
                    alignItems: "center",
                    marginTop: 4,
                    opacity: savingPassword ? 0.6 : 1,
                  }}
                >
                  {savingPassword ? (
                    <ActivityIndicator color={WHITE} size="small" />
                  ) : (
                    <Text style={{ color: WHITE, fontFamily: FONT_EXTRABOLD, fontSize: 15 }}>
                      Zatwierdź
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </AnimatedSheetModal>

          <AnimatedSheetModal
            visible={showPhoneModal}
            onClose={() => {
              setShowPhoneModal(false);
              setNewPhone("");
              setPhonePassword("");
            }}
          >
            <View
              style={{
                backgroundColor: WHITE,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 20, fontFamily: FONT_SEMI, color: BLACK }}>
                  Zmień numer telefonu
                </Text>
                <Pressable
                  onPress={() => {
                    setShowPhoneModal(false);
                    setNewPhone("");
                    setPhonePassword("");
                  }}
                >
                  <Ionicons name="close" size={24} color={BLACK} />
                </Pressable>
              </View>
              <View style={{ gap: 12 }}>
                <TextInput
                  value={newPhone}
                  onChangeText={setNewPhone}
                  placeholder="Nowy numer telefonu"
                  placeholderTextColor={PLACEHOLDER}
                  keyboardType="phone-pad"
                  style={{
                    borderWidth: 1,
                    borderColor: BORDER,
                    borderRadius: 10,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    fontSize: 14,
                    backgroundColor: INPUT_BG,
                    color: BLACK,
                    fontFamily: FONT_LIGHT,
                  }}
                />
                <TextInput
                  placeholder="Obecne hasło"
                  placeholderTextColor={PLACEHOLDER}
                  secureTextEntry
                  value={phonePassword}
                  onChangeText={setPhonePassword}
                  autoCapitalize="none"
                  style={{
                    borderWidth: 1,
                    borderColor: BORDER,
                    borderRadius: 10,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    fontSize: 14,
                    backgroundColor: INPUT_BG,
                    color: BLACK,
                    fontFamily: FONT_LIGHT,
                  }}
                />
                <Pressable
                  onPress={handleChangePhone}
                  disabled={savingPhone}
                  style={{
                    backgroundColor: BLACK,
                    paddingVertical: 16,
                    borderRadius: 12,
                    marginTop: 6,
                    alignItems: "center",
                    opacity: savingPhone ? 0.6 : 1,
                  }}
                >
                  {savingPhone ? (
                    <ActivityIndicator color={WHITE} size="small" />
                  ) : (
                    <Text style={{ color: WHITE, fontFamily: FONT_BOLD, fontSize: 15 }}>
                      Zatwierdź
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </AnimatedSheetModal>

          <AnimatedSheetModal
            visible={showCardModal}
            onClose={() => {
              setShowCardModal(false);
              setShowCardForm(false);
              setCardPassword("");
            }}
          >
            <View
              style={{
                backgroundColor: WHITE,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 20, fontFamily: FONT_SEMI, color: BLACK }}>
                  Metoda płatności
                </Text>
                <Pressable
                  onPress={() => {
                    setShowCardModal(false);
                    setShowCardForm(false);
                    setCardPassword("");
                  }}
                >
                  <Ionicons name="close" size={24} color={BLACK} />
                </Pressable>
              </View>

              {savedCard && !showCardForm ? (
                <View style={{ gap: 12 }}>
                  <View
                    style={{
                      backgroundColor: INPUT_BG,
                      borderRadius: 12,
                      padding: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      borderWidth: 1,
                      borderColor: BORDER,
                    }}
                  >
                    <Ionicons name="card-outline" size={26} color={BLACK} />
                    <View>
                      <Text style={{ fontSize: 15, fontFamily: FONT_BOLD, color: BLACK }}>
                        {savedCard.brand.toUpperCase()} •••• {savedCard.last4}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: MUTED,
                          marginTop: 2,
                          fontFamily: FONT_REGULAR,
                        }}
                      >
                        Wygasa {savedCard.expMonth}/{savedCard.expYear}
                      </Text>
                    </View>
                  </View>
                  <View style={{ gap: 10 }}>
                    <Pressable
                      onPress={() => setShowCardForm(true)}
                      style={{
                        paddingVertical: 14,
                        backgroundColor: BLACK,
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: WHITE, fontFamily: FONT_BOLD, fontSize: 14 }}>
                        Zmień kartę
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        try {
                          await api.delete("/api/stripe/card");
                          setSavedCard(null);
                          setShowCardModal(false);
                          Alert.alert("Gotowe!", "Karta została usunięta.");
                        } catch {
                          Alert.alert("Błąd", "Nie udało się usunąć karty");
                        }
                      }}
                      style={{
                        padding: 14,
                        backgroundColor: LIGHT_BG,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontFamily: FONT_BOLD, color: "#333", fontSize: 14 }}>
                        Usuń kartę
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <CardField
                    postalCodeEnabled={false}
                    placeholders={{ number: "1234 5678 9012 3456" }}
                    cardStyle={{
                      backgroundColor: INPUT_BG,
                      textColor: BLACK,
                      borderColor: BORDER,
                      borderWidth: 1,
                      borderRadius: 12,
                      fontSize: 14,
                    }}
                    style={{ width: "100%", height: 52 }}
                    onCardChange={(details) => setCardDetails(details)}
                  />
                  <TextInput
                    placeholder="Wpisz hasło"
                    placeholderTextColor={PLACEHOLDER}
                    secureTextEntry
                    value={cardPassword}
                    onChangeText={setCardPassword}
                    autoCapitalize="none"
                    style={{
                      borderWidth: 1,
                      borderColor: BORDER,
                      borderRadius: 10,
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      fontSize: 14,
                      backgroundColor: INPUT_BG,
                      color: BLACK,
                      fontFamily: FONT_LIGHT,
                    }}
                  />
                  <Pressable
                    onPress={handleSaveCard}
                    disabled={savingCard || !cardDetails?.complete}
                    style={{
                      backgroundColor: cardDetails?.complete ? BLACK : ICON_MUTED,
                      paddingVertical: 16,
                      borderRadius: 12,
                      alignItems: "center",
                      marginTop: 6,
                      opacity: savingCard ? 0.6 : 1,
                    }}
                  >
                    {savingCard ? (
                      <ActivityIndicator color={WHITE} size="small" />
                    ) : (
                      <Text style={{ color: WHITE, fontFamily: FONT_BOLD, fontSize: 15 }}>
                        Zatwierdź
                      </Text>
                    )}
                  </Pressable>
                  {savedCard && (
                    <Pressable
                      onPress={() => setShowCardForm(false)}
                      style={{ padding: 12, alignItems: "center" }}
                    >
                      <Text style={{ color: MUTED, fontFamily: FONT_SEMI }}>Anuluj</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </AnimatedSheetModal>

          <AnimatedSheetModal
            visible={showDeleteAccount}
            onClose={() => {
              setShowDeleteAccount(false);
              setDeletePassword("");
            }}
          >
            <View
              style={{
                backgroundColor: WHITE,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: insets.bottom + 24,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 20, fontFamily: FONT_SEMI, color: BLACK }}>
                  Usuń konto
                </Text>
                <Pressable
                  onPress={() => {
                    setShowDeleteAccount(false);
                    setDeletePassword("");
                  }}
                >
                  <Ionicons name="close" size={24} color={BLACK} />
                </Pressable>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: MUTED,
                  lineHeight: 20,
                  marginBottom: 18,
                  fontFamily: FONT_REGULAR,
                }}
              >
                Ta operacja jest nieodwracalna. Wszystkie Twoje dane zostaną trwale
                usunięte — subskrypcje, historia oglądania, oceny i dane płatności.
              </Text>
              <View style={{ gap: 12 }}>
                <TextInput
                  placeholder="Wpisz hasło aby potwierdzić"
                  placeholderTextColor={PLACEHOLDER}
                  secureTextEntry
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  autoCapitalize="none"
                  style={{
                    borderWidth: 1,
                    borderColor: BORDER,
                    borderRadius: 10,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    fontSize: 14,
                    backgroundColor: INPUT_BG,
                    color: BLACK,
                    fontFamily: FONT_LIGHT,
                  }}
                />
                <Pressable
                  onPress={handleDeleteAccount}
                  disabled={deletingAccount}
                  style={{
                    backgroundColor: BLACK,
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: "center",
                    marginTop: 6,
                    opacity: deletingAccount ? 0.6 : 1,
                  }}
                >
                  {deletingAccount ? (
                    <ActivityIndicator color={WHITE} size="small" />
                  ) : (
                    <Text
                      style={{
                        color: WHITE,
                        textAlign: "center",
                        fontFamily: FONT_BOLD,
                        fontSize: 15,
                      }}
                    >
                      Usuń konto
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowDeleteAccount(false);
                    setDeletePassword("");
                  }}
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
            </View>
          </AnimatedSheetModal>

          <TermsModal
            visible={showTermsModal}
            onClose={() => setShowTermsModal(false)}
          />
          <HelpModal
            visible={showHelpModal}
            onClose={() => setShowHelpModal(false)}
          />
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BLACK}
            title="Odświeżanie..."
          />
        }
      >
        <View
          style={{
            flexDirection: "row",
            backgroundColor: LIGHT_BG,
            borderRadius: 12,
            padding: 2,
            marginBottom: 4,
          }}
        >
          {(["movies", "series"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: activeTab === tab ? WHITE : "transparent",
                shadowColor: activeTab === tab ? SHADOW : "transparent",
                shadowOpacity: activeTab === tab ? 0.08 : 0,
                shadowRadius: 4,
                elevation: activeTab === tab ? 2 : 0,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: activeTab === tab ? FONT_BOLD : FONT_MEDIUM,
                  color: activeTab === tab ? BLACK : MUTED,
                }}
              >
                {tab === "movies" ? "Filmy" : "Seriale"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View
          style={{
            backgroundColor: WHITE,
            borderRadius: 16,
            paddingVertical: 20,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: SHADOW,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 25, fontFamily: FONT_BOLD, color: BLACK }}>
              {watchStats
                ? activeTab === "movies"
                  ? watchStats.movies.count
                  : watchStats.series.episodeCount
                : "—"}
            </Text>
            <Text style={{ fontSize: 11, color: MUTED, fontFamily: FONT_REGULAR }}>
              {activeTab === "movies" ? "Obejrzane filmy" : "Obejrzane odcinki"}
            </Text>
          </View>

          <View style={{ width: 1, height: 40, backgroundColor: DIVIDER }} />

          <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 25, fontFamily: FONT_BOLD, color: BLACK }}>
              {watchStats
                ? formatTime(
                    activeTab === "movies"
                      ? watchStats.movies.minutes
                      : watchStats.series.minutes
                  )
                : "—"}
            </Text>
            <Text style={{ fontSize: 11, color: MUTED, fontFamily: FONT_REGULAR }}>
              Czas oglądania
            </Text>
          </View>
        </View>

        {activeTab === "movies" ? (
          <View style={{ gap: 16, marginTop: 4 }}>
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 12,
                padding: 16,
                paddingBottom: 16,
                gap: 12,
                shadowColor: SHADOW,
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <HorizontalSection
                title="Ulubione"
                items={watchedData?.movies.filter((m) => m.favorite) ?? []}
                mediaType="movie"
                filter="favorite"
                emptyText="Brak ulubionych filmów"
              />
            </View>
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 12,
                padding: 16,
                paddingBottom: 16,
                gap: 12,
                shadowColor: SHADOW,
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <HorizontalSection
                title="Obejrzane"
                items={watchedData?.movies.filter((m) => m.watched) ?? []}
                mediaType="movie"
                filter="watched"
                emptyText="Brak obejrzanych filmów"
              />
            </View>
          </View>
        ) : (
          <View style={{ gap: 16, marginTop: 4 }}>
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 12,
                padding: 16,
                paddingBottom: 16,
                gap: 12,
                shadowColor: SHADOW,
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <HorizontalSection
                title="Ulubione"
                items={watchedData?.series.filter((s) => s.favorite) ?? []}
                mediaType="tv"
                filter="favorite"
                emptyText="Brak ulubionych seriali"
              />
            </View>
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 12,
                padding: 16,
                paddingBottom: 16,
                gap: 12,
                shadowColor: SHADOW,
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <HorizontalSection
                title="W trakcie"
                items={
                  watchedData?.series.filter((s) => s.status === "in_progress") ?? []
                }
                mediaType="tv"
                filter="in_progress"
                emptyText="Brak seriali w trakcie"
              />
            </View>
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 12,
                padding: 16,
                paddingBottom: 16,
                gap: 12,
                shadowColor: SHADOW,
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <HorizontalSection
                title="Ukończone"
                items={
                  watchedData?.series.filter((s) => s.status === "completed") ?? []
                }
                mediaType="tv"
                filter="completed"
                emptyText="Brak ukończonych seriali"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}