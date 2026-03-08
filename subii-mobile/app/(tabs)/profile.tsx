import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, Pressable, Alert, ActivityIndicator, ScrollView,
  RefreshControl, Image, Modal, TextInput,
  KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform
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

const PosterCard = React.memo(({ item, mediaType, onPress }: {
  item: any;
  mediaType: "movie" | "tv";
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} style={{ width: 110 }}>
    {item.posterUrl ? (
      <Image source={{ uri: item.posterUrl }} style={{ width: 110, height: 165, borderRadius: 10 }} />
    ) : (
      <View style={{ width: 110, height: 165, borderRadius: 10, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 32 }}>{mediaType === "movie" ? "🎬" : "📺"}</Text>
      </View>
    )}
    <Text style={{ fontSize: 12, fontWeight: "600", color: "#000", marginTop: 6 }} numberOfLines={2}>
      {item.titlePL}
    </Text>
    {mediaType === "tv" && item.totalEpisodes > 0 && item.status === "in_progress" && (
      <Text style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{item.watchedEpisodes}/{item.totalEpisodes} odc.</Text>
    )}
  </Pressable>
));

export default function Profile() {
  const router = useRouter();
  const { logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"movies" | "series">("movies");
  const [watchedData, setWatchedData] = useState<{
    movies: {
      tmdbId: number; titlePL: string; posterUrl: string | null;
      year: number | null; favorite: boolean; watched: boolean; rating: number | null;
    }[];
    series: {
      tmdbId: number; titlePL: string; posterUrl: string | null;
      year: number | null; favorite: boolean;
      status: "completed" | "in_progress" | "favorite_only";
      watchedEpisodes: number; totalEpisodes: number; rating: number | null;
    }[];
  } | null>(null);
  const [watchStats, setWatchStats] = useState<{
    movies: { minutes: number; count: number };
    series: { minutes: number; episodeCount: number };
  } | null>(null);

  // Ustawienia
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Modale od dołu
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  // Formularz email
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Formularz hasło
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Formularz telefon
  const [newPhone, setNewPhone] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  // Karta płatnicza
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [cardPassword, setCardPassword] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [savedCard, setSavedCard] = useState<{ brand: string; last4: string; expMonth: number; expYear: number } | null>(null);
  const { confirmSetupIntent } = useStripe();

  // Usunięcie konta
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
    } catch (error) {
      const savedUser = await storage.getUser();
      setUser(savedUser);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUser();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert("Wylogować się?", "Czy na pewno chcesz się wylogować?", [
      { text: "Anuluj", style: "cancel" },
      { text: "Wyloguj", style: "destructive", onPress: async () => { await logout(); } }
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
      Alert.alert("Brak uprawnień", "Zezwól aplikacji na dostęp do galerii w ustawieniach.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    if (!emailPassword.trim()) {
      Alert.alert("Błąd", "Podaj swoje hasło aby zmienić email");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      Alert.alert("Błąd", "Podaj prawidłowy adres email");
      return;
    }
    setSavingEmail(true);
    try {
      await api.post("/api/auth/change-email", {
        newEmail: newEmail.trim().toLowerCase(),
        currentPassword: emailPassword
      });
      Alert.alert("Gotowe!", "Wysłaliśmy link weryfikacyjny na nowy adres e-mail.");
      setShowEmailModal(false);
      setEmailPassword("");
      setNewEmail("");
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się zmienić emaila");
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
      await api.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      Alert.alert("Gotowe!", "Hasło zostało zmienione.");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się zmienić hasła");
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
      await api.post("/api/auth/change-phone", { phone: newPhone.trim(), currentPassword: phonePassword });
      const updatedUser = { ...user, phone: newPhone.trim() };
      setUser(updatedUser);
      await storage.setUser(updatedUser);
      Alert.alert("Gotowe!", "Numer telefonu został zaktualizowany.");
      setShowPhoneModal(false);
      setNewPhone("");
      setPhonePassword("");
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się zmienić numeru");
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
      const { clientSecret } = res.data;
      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: "Card",
      });
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
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się zapisać karty");
    } finally {
      setSavingCard(false);
    }
  };

  const HorizontalSection = useCallback(({
    title, items, mediaType, filter, emptyText
  }: {
    title: string; items: any[]; mediaType: "movie" | "tv"; filter: string; emptyText: string;
  }) => (
    <View style={{ gap: 12 }}>
      <Pressable
        onPress={() => router.push({ pathname: "/watched-list", params: { type: mediaType === "movie" ? "movies" : "series", filter } } as any)}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <Text style={{ fontSize: 17, fontWeight: "800", color: "#000" }}>{title}</Text>
        <Text style={{ fontSize: 13, color: "#999", fontWeight: "600" }}>Zobacz wszystkie →</Text>
      </Pressable>
      {watchedData ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          {items.length === 0 ? (
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, minWidth: 200, alignItems: "center" }}>
              <Text style={{ color: "#999", fontSize: 13 }}>{emptyText}</Text>
            </View>
          ) : (
            items.map(item => (
              <PosterCard
                key={item.tmdbId}
                item={item}
                mediaType={mediaType}
                onPress={() => router.push({ pathname: "/titles/[tmdbId]", params: { tmdbId: String(item.tmdbId), mediaType } } as any)}
              />
            ))
          )}
        </ScrollView>
      ) : <ActivityIndicator color="#000" />}
    </View>
  ), [watchedData, router]);

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>

      {/* NAGŁÓWEK */}
      <View style={{ padding: 20, paddingTop: insets.top + 10, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable onPress={() => setShowSettingsModal(true)}>
            <View style={{ width: 54, height: 54, borderRadius: 32, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={{ width: 60, height: 60, borderRadius: 32 }} />
              ) : (
                <Ionicons name="person" size={40} color="#999" />
              )}
            </View>
          </Pressable>
          <View>
            <Text style={{ fontSize: 28, fontWeight: "600", color: "#000" }}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={{ fontSize: 14, color: "#666", marginTop: 2 }}>{user?.email}</Text>
          </View>
        </View>
        <Pressable onPress={() => setShowSettingsModal(true)} style={{ padding: 8 }}>
          <MaterialIcons name="settings" size={25} color="#000" />
        </Pressable>
      </View>

      {/* ============================================================ */}
      {/* MODAL USTAWIEŃ                                                */}
      {/* ============================================================ */}
      <Modal visible={showSettingsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSettingsModal(false)}>
        <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
            <Text style={{ fontSize: 18, fontWeight: "800" }}>Ustawienia</Text>
            <Pressable onPress={() => setShowSettingsModal(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>

            {/* Zdjęcie profilowe */}
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={{ width: 70, height: 70, borderRadius: 35 }} />
                ) : (
                  <Ionicons name="person" size={40} color="#999" />
                )}
              </View>
              <Pressable onPress={handlePickImage} style={{ backgroundColor: "#000", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Zmień zdjęcie</Text>
              </Pressable>
            </View>

            {/* Imię i nazwisko */}
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20 }}>
              <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 4 }}>IMIĘ I NAZWISKO</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>{user?.firstName} {user?.lastName}</Text>
              <Text style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>Nie można zmienić danych osobowych</Text>
            </View>

            {/* Email */}
            <Pressable onPress={() => setShowEmailModal(true)}
              style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 4 }}>ADRES E-MAIL</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>{user?.email}</Text>
                <Text style={{ fontSize: 12, marginTop: 3, color: user?.emailVerified ? "#22c55e" : "#f59e0b", fontWeight: "600" }}>
                  {user?.emailVerified ? "✓ Zweryfikowany" : "⚠ Niezweryfikowany"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </Pressable>

            {/* Hasło */}
            <Pressable onPress={() => setShowPasswordModal(true)}
              style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 4 }}>HASŁO</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>Zmień hasło</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </Pressable>

            {/* Telefon */}
            <Pressable onPress={() => setShowPhoneModal(true)}
              style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 4 }}>TELEFON</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>{user?.phone || "Dodaj numer"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </Pressable>

            {/* Karta płatnicza */}
            <Pressable onPress={() => setShowCardModal(true)}
              style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 4 }}>METODA PŁATNOŚCI</Text>
                {savedCard ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ backgroundColor: "#f0f0f0", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#000", textTransform: "uppercase" }}>{savedCard.brand}</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>•••• {savedCard.last4}</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="card-outline" size={20} color="#000" />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>Dodaj kartę</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </Pressable>

            {/* Data urodzenia */}
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20 }}>
              <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 4 }}>DATA URODZENIA</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>
                {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString("pl-PL") : "—"}
              </Text>
            </View>

            {/* Wyloguj */}
            <Pressable onPress={() => { setShowSettingsModal(false); handleLogout(); }}
              style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, alignItems: "center", borderWidth: 1.5, borderColor: "#fca5a5", marginTop: 8 }}>
              <Text style={{ color: "#dc2626", fontWeight: "800", fontSize: 15 }}>Wyloguj się</Text>
            </Pressable>

            <Pressable onPress={() => setShowDeleteAccount(true)} style={{ padding: 16, alignItems: "center", marginTop: 8 }}>
              <Text style={{ fontSize: 14, color: "#dc2626", fontWeight: "600" }}>Usuń konto</Text>
            </Pressable>

            {/* Regulamin */}
            <Pressable onPress={() => { setShowSettingsModal(false); setTimeout(() => router.push("/terms" as any), 300); }}
              style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#000" }}>Regulamin i prywatność</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </Pressable>

            {/* Centrum pomocy */}
            <Pressable onPress={() => { setShowSettingsModal(false); setTimeout(() => router.push("/help" as any), 300); }}
              style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#000" }}>Centrum pomocy</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </Pressable>

          </ScrollView>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* GŁÓWNA TREŚĆ                                                  */}
      {/* ============================================================ */}
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" title="Odświeżanie..." />}
      >
        <View style={{ flexDirection: "row", backgroundColor: "#e8e8e8", borderRadius: 12, padding: 3 }}>
          {(["movies", "series"] as const).map((tab) => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 10,
                backgroundColor: activeTab === tab ? "#fff" : "transparent", alignItems: "center",
                shadowColor: activeTab === tab ? "#000" : "transparent",
                shadowOpacity: 0.08, shadowRadius: 4, elevation: activeTab === tab ? 2 : 0,
              }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: activeTab === tab ? "#000" : "#999" }}>
                {tab === "movies" ? "🎬 Filmy" : "📺 Serie"}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "movies" && (
          <View style={{ gap: 24 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, minWidth: 150, alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 28, fontWeight: "900", color: "#000" }}>{watchStats ? formatTime(watchStats.movies.minutes) : "—"}</Text>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600" }}>Czas oglądania</Text>
              </View>
              <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, minWidth: 150, alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 28, fontWeight: "900", color: "#000" }}>{watchStats ? watchStats.movies.count : "—"}</Text>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600" }}>{watchStats?.movies.count === 1 ? "Film" : "Filmów"}</Text>
              </View>
            </ScrollView>
            <HorizontalSection title="❤️ Ulubione" items={watchedData?.movies.filter(m => m.favorite) ?? []} mediaType="movie" filter="favorite" emptyText="Brak ulubionych filmów" />
            <HorizontalSection title="✅ Obejrzane" items={watchedData?.movies.filter(m => m.watched) ?? []} mediaType="movie" filter="watched" emptyText="Brak obejrzanych filmów" />
          </View>
        )}

        {activeTab === "series" && (
          <View style={{ gap: 24 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, minWidth: 150, alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 28, fontWeight: "900", color: "#000" }}>{watchStats ? formatTime(watchStats.series.minutes) : "—"}</Text>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600" }}>Czas oglądania</Text>
              </View>
              <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, minWidth: 150, alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 28, fontWeight: "900", color: "#000" }}>{watchStats ? watchStats.series.episodeCount : "—"}</Text>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600" }}>{watchStats?.series.episodeCount === 1 ? "Odcinek" : "Odcinków"}</Text>
              </View>
            </ScrollView>
            <HorizontalSection title="❤️ Ulubione" items={watchedData?.series.filter(s => s.favorite) ?? []} mediaType="tv" filter="favorite" emptyText="Brak ulubionych seriali" />
            <HorizontalSection title="▶️ W trakcie" items={watchedData?.series.filter(s => s.status === "in_progress") ?? []} mediaType="tv" filter="in_progress" emptyText="Brak seriali w trakcie" />
            <HorizontalSection title="🏁 Ukończone" items={watchedData?.series.filter(s => s.status === "completed") ?? []} mediaType="tv" filter="completed" emptyText="Brak ukończonych seriali" />
          </View>
        )}
      </ScrollView>

      {/* ============================================================ */}
      {/* MODAL: Zmiana emaila                                          */}
      {/* ============================================================ */}
      <Modal visible={showEmailModal} transparent animationType="slide" onRequestClose={() => setShowEmailModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <Pressable style={{ flex: 1 }} onPress={() => setShowEmailModal(false)} />
              <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: "800" }}>Zmień adres e-mail</Text>
                  <Pressable onPress={() => { setShowEmailModal(false); setNewEmail(""); setEmailPassword(""); }}>
                    <Ionicons name="close" size={24} color="#000" />
                  </Pressable>
                </View>
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 6 }}>OBECNE HASŁO</Text>
                    <TextInput placeholder="Wpisz obecne hasło" secureTextEntry value={emailPassword} onChangeText={setEmailPassword}
                      style={{ borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: "#f9f9f9" }} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 6 }}>NOWY ADRES E-MAIL</Text>
                    <TextInput value={newEmail} onChangeText={setNewEmail} placeholder="Nowy adres e-mail" keyboardType="email-address" autoCapitalize="none"
                      style={{ borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: "#f9f9f9" }} />
                  </View>
                  <Pressable onPress={handleChangeEmail} disabled={savingEmail}
                    style={{ backgroundColor: "#000", padding: 16, borderRadius: 14, alignItems: "center", marginTop: 4, opacity: savingEmail ? 0.6 : 1 }}>
                    {savingEmail ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Zatwierdź</Text>}
                  </Pressable>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: Zmiana hasła                                           */}
      {/* ============================================================ */}
      <Modal visible={showPasswordModal} transparent animationType="slide" onRequestClose={() => setShowPasswordModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <Pressable style={{ flex: 1 }} onPress={() => setShowPasswordModal(false)} />
              <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: "800" }}>Zmień hasło</Text>
                  <Pressable onPress={() => { setShowPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>
                    <Ionicons name="close" size={24} color="#000" />
                  </Pressable>
                </View>
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 6 }}>OBECNE HASŁO</Text>
                    <TextInput placeholder="Wpisz obecne hasło" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword}
                      style={{ borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: "#f9f9f9" }} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 6 }}>NOWE HASŁO</Text>
                    <TextInput placeholder="Wpisz nowe hasło" secureTextEntry value={newPassword} onChangeText={setNewPassword}
                      style={{ borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: "#f9f9f9" }} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 6 }}>POTWIERDŹ NOWE HASŁO</Text>
                    <TextInput placeholder="Powtórz nowe hasło" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword}
                      style={{ borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: "#f9f9f9" }} />
                  </View>
                  <Pressable onPress={handleChangePassword} disabled={savingPassword}
                    style={{ backgroundColor: "#000", padding: 16, borderRadius: 14, alignItems: "center", marginTop: 4, opacity: savingPassword ? 0.6 : 1 }}>
                    {savingPassword ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Zatwierdź</Text>}
                  </Pressable>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: Zmiana telefonu                                        */}
      {/* ============================================================ */}
      <Modal visible={showPhoneModal} transparent animationType="slide" onRequestClose={() => setShowPhoneModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <Pressable style={{ flex: 1 }} onPress={() => setShowPhoneModal(false)} />
              <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: "800" }}>Zmień numer telefonu</Text>
                  <Pressable onPress={() => { setShowPhoneModal(false); setNewPhone(""); setPhonePassword(""); }}>
                    <Ionicons name="close" size={24} color="#000" />
                  </Pressable>
                </View>
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 6 }}>OBECNE HASŁO</Text>
                    <TextInput placeholder="Wpisz obecne hasło" secureTextEntry value={phonePassword} onChangeText={setPhonePassword}
                      style={{ borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: "#f9f9f9" }} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 6 }}>NOWY NUMER TELEFONU</Text>
                    <TextInput value={newPhone} onChangeText={setNewPhone} placeholder="Nowy numer telefonu" keyboardType="phone-pad"
                      style={{ borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: "#f9f9f9" }} />
                  </View>
                  <Pressable onPress={handleChangePhone} disabled={savingPhone}
                    style={{ backgroundColor: "#000", padding: 16, borderRadius: 14, alignItems: "center", marginTop: 4, opacity: savingPhone ? 0.6 : 1 }}>
                    {savingPhone ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Zatwierdź</Text>}
                  </Pressable>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: Metoda płatności                                       */}
      {/* ============================================================ */}
      <Modal visible={showCardModal} transparent animationType="slide" onRequestClose={() => setShowCardModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <Pressable style={{ flex: 1 }} onPress={() => setShowCardModal(false)} />
              <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: "800" }}>Metoda płatności</Text>
                  <Pressable onPress={() => { setShowCardModal(false); setShowCardForm(false); setCardPassword(""); }}>
                    <Ionicons name="close" size={24} color="#000" />
                  </Pressable>
                </View>

                {savedCard && !showCardForm ? (
                  <View style={{ gap: 16 }}>
                    <View style={{ backgroundColor: "#f5f5f5", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#000", textTransform: "uppercase" }}>{savedCard.brand}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>•••• •••• •••• {savedCard.last4}</Text>
                        <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Wygasa {savedCard.expMonth.toString().padStart(2, "0")}/{savedCard.expYear}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Pressable onPress={() => setShowCardForm(true)}
                        style={{ flex: 1, padding: 14, backgroundColor: "#000", borderRadius: 12, alignItems: "center" }}>
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Zmień kartę</Text>
                      </Pressable>
                      <Pressable
                        onPress={async () => {
                          try {
                            await api.post("/api/stripe/card/delete");
                            setSavedCard(null);
                            setShowCardModal(false);
                            Alert.alert("Gotowe", "Karta została usunięta.");
                          } catch (e: any) {
                            const errorCode = e.response?.data?.error;
                            const message = e.response?.data?.message;
                            if (errorCode === "HAS_ACTIVE_SUBSCRIPTIONS") {
                              Alert.alert("Nie można usunąć karty", message, [
                                { text: "Anuluj", style: "cancel" },
                                { text: "Zmień kartę", onPress: () => setShowCardForm(true) },
                              ]);
                            } else {
                              Alert.alert("Błąd", "Nie udało się usunąć karty.");
                            }
                          }
                        }}
                        style={{ flex: 1, padding: 14, backgroundColor: "#fff5f5", borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#fca5a5" }}>
                        <Text style={{ color: "#dc2626", fontWeight: "700", fontSize: 14 }}>Usuń kartę</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    <CardField
                      postalCodeEnabled={false}
                      placeholders={{ number: "1234 5678 9012 3456" }}
                      cardStyle={{ backgroundColor: "#f9f9f9", textColor: "#000", borderColor: "#e0e0e0", borderWidth: 1, borderRadius: 10, fontSize: 15 }}
                      style={{ width: "100%", height: 52 }}
                      onCardChange={(details) => setCardDetails(details)}
                    />
                    <View>
                      <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 6 }}>POTWIERDŹ HASŁEM</Text>
                      <TextInput placeholder="Wpisz hasło" secureTextEntry value={cardPassword} onChangeText={setCardPassword}
                        style={{ borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: "#f9f9f9" }} />
                    </View>
                    <Text style={{ fontSize: 11, color: "#999", textAlign: "center" }}>
                      🔒 Dane karty są szyfrowane przez Stripe. Subii nie przechowuje numerów kart.
                    </Text>
                    <Pressable onPress={handleSaveCard} disabled={savingCard || !cardDetails?.complete}
                      style={{ backgroundColor: cardDetails?.complete ? "#000" : "#ccc", padding: 16, borderRadius: 14, alignItems: "center", opacity: savingCard ? 0.6 : 1 }}>
                      {savingCard ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Zatwierdź</Text>}
                    </Pressable>
                    {savedCard && (
                      <Pressable onPress={() => setShowCardForm(false)} style={{ padding: 12, alignItems: "center" }}>
                        <Text style={{ color: "#666", fontWeight: "600" }}>Anuluj</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL: Usunięcie konta                                        */}
      {/* ============================================================ */}
      <Modal visible={showDeleteAccount} transparent animationType="slide" onRequestClose={() => setShowDeleteAccount(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
              <Pressable style={{ flex: 1 }} onPress={() => setShowDeleteAccount(false)} />
              <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: "#dc2626", marginBottom: 8 }}>Usuń konto</Text>
                <Text style={{ fontSize: 14, color: "#666", lineHeight: 22, marginBottom: 20 }}>
                  Ta operacja jest nieodwracalna. Wszystkie Twoje dane zostaną trwale usunięte — subskrypcje, historia oglądania, oceny i dane płatności.
                </Text>
                <View style={{ backgroundColor: "#fff5f5", borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: "#fca5a5" }}>
                  <Text style={{ fontSize: 13, color: "#dc2626", lineHeight: 20 }}>⚠️ Potwierdź hasłem że chcesz usunąć swoje konto w Subii.</Text>
                </View>
                <Text style={{ fontSize: 13, color: "#999", fontWeight: "600", marginBottom: 8 }}>TWOJE HASŁO</Text>
                <TextInput value={deletePassword} onChangeText={setDeletePassword} placeholder="Wpisz hasło" secureTextEntry
                  style={{ borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 20, backgroundColor: "#fafafa" }} />
                <Pressable onPress={handleDeleteAccount} disabled={deletingAccount}
                  style={{ padding: 16, backgroundColor: deletingAccount ? "#ccc" : "#dc2626", borderRadius: 14, alignItems: "center", marginBottom: 12 }}>
                  {deletingAccount ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Usuń konto na zawsze</Text>}
                </Pressable>
                <Pressable onPress={() => { setShowDeleteAccount(false); setDeletePassword(""); }}
                  style={{ padding: 14, backgroundColor: "#f0f0f0", borderRadius: 12, alignItems: "center" }}>
                  <Text style={{ fontWeight: "700", color: "#333" }}>Anuluj</Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}