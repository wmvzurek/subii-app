import { useState, useEffect } from "react";
import {
  View, Text, Pressable, Alert, ActivityIndicator, ScrollView,
  RefreshControl, Image, Modal, TextInput
} from "react-native";
import { useRouter } from "expo-router";
import { storage } from "../../src/lib/storage";
import { useAuth } from "../../src/contexts/AuthContext";
import { api } from "../../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStripe, CardField, CardFieldInput } from "@stripe/stripe-react-native";
import * as ImagePicker from "expo-image-picker";



export default function Profile() {
  const router = useRouter();
  const { logout, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

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

  // Ustawienia modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  // Karta płatnicza
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [savingCard, setSavingCard] = useState(false);
  const [savedCard, setSavedCard] = useState<{ brand: string; last4: string; expMonth: number; expYear: number } | null>(null);
  const { confirmSetupIntent } = useStripe();

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
      // Załaduj dane karty
      try {
        const cardRes = await api.get("/api/stripe/card");
        if (cardRes.data.card) setSavedCard(cardRes.data.card);
      } catch {}
      try {
        const stats = await api.get("/api/user-stats");
        setWatchStats(stats.data);
        const watched = await api.get("/api/user-watched");
        setWatchedData(watched.data);
      } catch {
        // statystyki opcjonalne
      }
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
    Alert.alert(
      "Wylogować się?",
      "Czy na pewno chcesz się wylogować?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Wyloguj",
          style: "destructive",
          onPress: async () => { await logout(); }
        }
      ]
    );
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
    setSavingEmail(true);
    try {
      await api.post("/api/auth/change-email", { newEmail: newEmail.trim() });
      Alert.alert("Gotowe!", "Wysłaliśmy link weryfikacyjny na nowy adres e-mail.");
      setShowChangeEmail(false);
      setNewEmail("");
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się zmienić emaila");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePhone = async () => {
    if (!newPhone.trim()) return;
    setSavingPhone(true);
    try {
      await api.post("/api/auth/change-phone", { phone: newPhone.trim() });
      const updatedUser = { ...user, phone: newPhone.trim() };
      setUser(updatedUser);
      await storage.setUser(updatedUser);
      Alert.alert("Gotowe!", "Numer telefonu został zaktualizowany.");
      setShowChangePhone(false);
      setNewPhone("");
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
      // Pobierz SetupIntent z backendu
      const res = await api.post("/api/stripe/setup-intent");
      const { clientSecret } = res.data;

      // Potwierdź kartę przez Stripe SDK
      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        Alert.alert("Błąd", error.message);
        return;
      }

      // Zapisz paymentMethodId na backendzie
      await api.post("/api/stripe/save-payment-method", {
        paymentMethodId: setupIntent!.paymentMethodId,
      });

      // Odśwież dane karty
      const cardRes = await api.get("/api/stripe/card");
      if (cardRes.data.card) setSavedCard(cardRes.data.card);

      setShowCardForm(false);
      Alert.alert("Gotowe!", "Karta została zapisana pomyślnie.");
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się zapisać karty");
    } finally {
      setSavingCard(false);
    }
  };

  // Komponent plakatu do poziomych list
  const PosterCard = ({ item, mediaType }: { item: any; mediaType: "movie" | "tv" }) => (
    <Pressable
      onPress={() => router.push({ pathname: "/titles/[tmdbId]", params: { tmdbId: String(item.tmdbId), mediaType } } as any)}
      style={{ width: 110 }}
    >
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
  );

  // Komponent sekcji z poziomą listą
  const HorizontalSection = ({
    title, items, mediaType, filter, emptyText
  }: {
    title: string;
    items: any[];
    mediaType: "movie" | "tv";
    filter: string;
    emptyText: string;
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
            items.map(item => <PosterCard key={item.tmdbId} item={item} mediaType={mediaType} />)
          )}
        </ScrollView>
      ) : <ActivityIndicator color="#000" />}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>

      {/* NAGŁÓWEK z zdjęciem i trzema kropkami */}
      <View style={{ padding: 20, paddingTop: insets.top + 10, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable onPress={() => setShowSettingsModal(true)}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={{ width: 64, height: 64, borderRadius: 32 }} />
              ) : (
                <Ionicons name="person-circle" size={64} color="#ccc" />
              )}
            </View>
          </Pressable>
          <View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#000" }}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={{ fontSize: 13, color: "#999", marginTop: 2 }}>{user?.email}</Text>
          </View>
        </View>
        <Pressable onPress={() => setShowSettingsModal(true)} style={{ padding: 8 }}>
          <Ionicons name="ellipsis-vertical" size={22} color="#000" />
        </Pressable>
      </View>

      {/* MODAL USTAWIEŃ */}
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
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, alignItems: "center", gap: 12 }}>
              <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={{ width: 90, height: 90, borderRadius: 45 }} />
                ) : (
                  <Ionicons name="person-circle" size={90} color="#ccc" />
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
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, gap: 10 }}>
              <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 4 }}>ADRES E-MAIL</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>{user?.email}</Text>
                  <Text style={{ fontSize: 12, marginTop: 3, color: user?.emailVerified ? "#22c55e" : "#f59e0b", fontWeight: "600" }}>
                    {user?.emailVerified ? "✓ Zweryfikowany" : "⚠ Niezweryfikowany"}
                  </Text>
                </View>
                <Pressable onPress={() => { setShowChangeEmail(!showChangeEmail); setNewEmail(""); }} style={{ padding: 8 }}>
                  <Ionicons name="pencil" size={18} color="#000" />
                </Pressable>
              </View>
              {showChangeEmail && (
                <View style={{ gap: 10, marginTop: 8 }}>
                  <TextInput
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder="Nowy adres e-mail"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={{ borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: "#f9f9f9" }}
                  />
                  <Pressable onPress={handleChangeEmail} disabled={savingEmail} style={{ backgroundColor: "#000", padding: 12, borderRadius: 10, alignItems: "center", opacity: savingEmail ? 0.6 : 1 }}>
                    {savingEmail ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Zapisz i wyślij weryfikację</Text>}
                  </Pressable>
                </View>
              )}
            </View>

            {/* Zmień hasło */}
            <Pressable
              onPress={() => { setShowSettingsModal(false); setTimeout(() => router.push("/change-password" as any), 300); }}
              style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            >
              <View>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 4 }}>HASŁO</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>Zmień hasło</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </Pressable>

            {/* Telefon */}
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, gap: 10 }}>
              <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 4 }}>TELEFON</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>{user?.phone}</Text>
                <Pressable onPress={() => { setShowChangePhone(!showChangePhone); setNewPhone(""); }} style={{ padding: 8 }}>
                  <Ionicons name="pencil" size={18} color="#000" />
                </Pressable>
              </View>
              {showChangePhone && (
                <View style={{ gap: 10, marginTop: 8 }}>
                  <TextInput
                    value={newPhone}
                    onChangeText={setNewPhone}
                    placeholder="Nowy numer telefonu"
                    keyboardType="phone-pad"
                    style={{ borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: "#f9f9f9" }}
                  />
                  <Pressable onPress={handleChangePhone} disabled={savingPhone} style={{ backgroundColor: "#000", padding: 12, borderRadius: 10, alignItems: "center", opacity: savingPhone ? 0.6 : 1 }}>
                    {savingPhone ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Zapisz</Text>}
                  </Pressable>
                </View>
              )}
            </View>

            {/* Karta płatnicza */}
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, gap: 10 }}>
              <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 4 }}>METODA PŁATNOŚCI</Text>

              {savedCard ? (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ backgroundColor: "#f0f0f0", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#000", textTransform: "uppercase" }}>
                        {savedCard.brand}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>
                        •••• •••• •••• {savedCard.last4}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                        Wygasa {savedCard.expMonth.toString().padStart(2, "0")}/{savedCard.expYear}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    <Pressable onPress={() => setShowCardForm(!showCardForm)} style={{ padding: 8 }}>
                      <Ionicons name="pencil" size={18} color="#000" />
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        try {
                          await api.post("/api/stripe/card/delete");
                          setSavedCard(null);
                          Alert.alert("Gotowe", "Karta została usunięta.");
                        } catch (e: any) {
                          const errorCode = e.response?.data?.error;
                          const message = e.response?.data?.message;

                          if (errorCode === "HAS_ACTIVE_SUBSCRIPTIONS") {
                            Alert.alert(
                              "Nie można usunąć karty",
                              message,
                              [
                                { text: "Anuluj", style: "cancel" },
                                {
                                  text: "Zmień kartę",
                                  onPress: () => setShowCardForm(true),
                                },
                              ]
                            );
                          } else {
                            Alert.alert("Błąd", "Nie udało się usunąć karty.");
                          }
                        }
                      }}
                      style={{ padding: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => setShowCardForm(!showCardForm)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                >
                  <Ionicons name="card-outline" size={22} color="#000" />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>Dodaj kartę płatniczą</Text>
                </Pressable>
              )}

              {showCardForm && (
                <View style={{ gap: 12, marginTop: 8 }}>
                  <CardField
                    postalCodeEnabled={false}
                    placeholders={{ number: "1234 5678 9012 3456" }}
                    cardStyle={{
                      backgroundColor: "#f9f9f9",
                      textColor: "#000",
                      borderColor: "#e0e0e0",
                      borderWidth: 1,
                      borderRadius: 10,
                      fontSize: 15,
                    }}
                    style={{ width: "100%", height: 52 }}
                    onCardChange={(details) => setCardDetails(details)}
                  />
                  <Text style={{ fontSize: 11, color: "#999", textAlign: "center" }}>
                    🔒 Dane karty są szyfrowane przez Stripe. Subii nie przechowuje numerów kart.
                  </Text>
                  <Pressable
                    onPress={handleSaveCard}
                    disabled={savingCard || !cardDetails?.complete}
                    style={{
                      backgroundColor: cardDetails?.complete ? "#000" : "#ccc",
                      padding: 14,
                      borderRadius: 10,
                      alignItems: "center",
                      opacity: savingCard ? 0.6 : 1,
                    }}
                  >
                    {savingCard
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={{ color: "#fff", fontWeight: "700" }}>Zapisz kartę</Text>
                    }
                  </Pressable>
                </View>
              )}
            </View>

            {/* Data urodzenia */}
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20 }}>
              <Text style={{ fontSize: 12, color: "#999", fontWeight: "600", marginBottom: 4 }}>DATA URODZENIA</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>
                {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString("pl-PL") : "—"}
              </Text>
            </View>

            {/* Wyloguj */}
            <Pressable
              onPress={() => { setShowSettingsModal(false); handleLogout(); }}
              style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, alignItems: "center", borderWidth: 1.5, borderColor: "#fca5a5", marginTop: 8 }}
            >
              <Text style={{ color: "#dc2626", fontWeight: "800", fontSize: 15 }}>Wyloguj się</Text>
            </Pressable>

            {/* Regulamin */}
            <Pressable
              onPress={() => { setShowSettingsModal(false); setTimeout(() => router.push("/terms" as any), 300); }}
              style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#000" }}>Regulamin i prywatność</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </Pressable>

            {/* Centrum pomocy */}
            <Pressable
              onPress={() => { setShowSettingsModal(false); setTimeout(() => router.push("/help" as any), 300); }}
              style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#000" }}>Centrum pomocy</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </Pressable>

          </ScrollView>
        </View>
      </Modal>

      {/* GŁÓWNA TREŚĆ */}
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" title="Odświeżanie..." />}
      >

        {/* Przełącznik zakładek */}
        <View style={{ flexDirection: "row", backgroundColor: "#e8e8e8", borderRadius: 12, padding: 3 }}>
          {(["movies", "series"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 10,
                backgroundColor: activeTab === tab ? "#fff" : "transparent",
                alignItems: "center",
                shadowColor: activeTab === tab ? "#000" : "transparent",
                shadowOpacity: 0.08, shadowRadius: 4, elevation: activeTab === tab ? 2 : 0,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: activeTab === tab ? "#000" : "#999" }}>
                {tab === "movies" ? "🎬 Filmy" : "📺 Serie"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ===== ZAKŁADKA FILMY ===== */}
        {activeTab === "movies" && (
          <View style={{ gap: 24 }}>

            {/* Statystyki filmów */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, minWidth: 150, alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 28, fontWeight: "900", color: "#000" }}>
                  {watchStats ? formatTime(watchStats.movies.minutes) : "—"}
                </Text>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600" }}>Czas oglądania</Text>
              </View>
              <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, minWidth: 150, alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 28, fontWeight: "900", color: "#000" }}>
                  {watchStats ? watchStats.movies.count : "—"}
                </Text>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600" }}>
                  {watchStats?.movies.count === 1 ? "Film" : "Filmów"}
                </Text>
              </View>
            </ScrollView>

            <HorizontalSection
              title="❤️ Ulubione"
              items={watchedData?.movies.filter(m => m.favorite) ?? []}
              mediaType="movie"
              filter="favorite"
              emptyText="Brak ulubionych filmów"
            />

            <HorizontalSection
              title="✅ Obejrzane"
              items={watchedData?.movies.filter(m => m.watched) ?? []}
              mediaType="movie"
              filter="watched"
              emptyText="Brak obejrzanych filmów"
            />

          </View>
        )}

        {/* ===== ZAKŁADKA SERIE ===== */}
        {activeTab === "series" && (
          <View style={{ gap: 24 }}>

            {/* Statystyki seriali */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, minWidth: 150, alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 28, fontWeight: "900", color: "#000" }}>
                  {watchStats ? formatTime(watchStats.series.minutes) : "—"}
                </Text>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600" }}>Czas oglądania</Text>
              </View>
              <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, minWidth: 150, alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 28, fontWeight: "900", color: "#000" }}>
                  {watchStats ? watchStats.series.episodeCount : "—"}
                </Text>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600" }}>
                  {watchStats?.series.episodeCount === 1 ? "Odcinek" : "Odcinków"}
                </Text>
              </View>
            </ScrollView>

            <HorizontalSection
              title="❤️ Ulubione"
              items={watchedData?.series.filter(s => s.favorite) ?? []}
              mediaType="tv"
              filter="favorite"
              emptyText="Brak ulubionych seriali"
            />

            <HorizontalSection
              title="▶️ W trakcie"
              items={watchedData?.series.filter(s => s.status === "in_progress") ?? []}
              mediaType="tv"
              filter="in_progress"
              emptyText="Brak seriali w trakcie"
            />

            <HorizontalSection
              title="🏁 Ukończone"
              items={watchedData?.series.filter(s => s.status === "completed") ?? []}
              mediaType="tv"
              filter="completed"
              emptyText="Brak ukończonych seriali"
            />

          </View>
        )}

      </ScrollView>
    </View>
  );
}