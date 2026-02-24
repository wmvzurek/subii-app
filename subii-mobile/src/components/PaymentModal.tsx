import { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, Modal, Alert, ActivityIndicator,
  Platform, TextInput, Animated, Easing,
} from "react-native";
import { useStripe, CardField, usePlatformPay, PlatformPay } from "@stripe/stripe-react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { api } from "../lib/api";

interface SavedCard {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  paymentMethodId: string;
}

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amountPLN: number;
  description: string;
}

export default function PaymentModal({
  visible, onClose, onSuccess, amountPLN, description,
}: PaymentModalProps) {
  const { confirmPayment } = useStripe();
  const { isPlatformPaySupported, confirmPlatformPayPayment } = usePlatformPay();

  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [loadingCard, setLoadingCard] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<"saved_card" | "blik" | "google_pay" | "new_card" | null>(null);
  const [blikCode, setBlikCode] = useState("");
  const [newCardDetails, setNewCardDetails] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [blikWaiting, setBlikWaiting] = useState(false);
  const [blikSeconds, setBlikSeconds] = useState(60);
  const [googlePayReady, setGooglePayReady] = useState(false);
  const blikInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const blikTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      loadSavedCard();
      checkGooglePay();
    } else {
      resetState();
    }
  }, [visible]);

  useEffect(() => {
    if (blikWaiting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [blikWaiting]);

  const resetState = () => {
    setSelectedMethod(null);
    setBlikCode("");
    setNewCardDetails(null);
    setProcessing(false);
    setBlikWaiting(false);
    setBlikSeconds(60);
    if (blikInterval.current) clearInterval(blikInterval.current);
    if (blikTimeout.current) clearTimeout(blikTimeout.current);
  };

  const loadSavedCard = async () => {
    setLoadingCard(true);
    try {
      const res = await api.get("/api/stripe/card");
      if (res.data.card) setSavedCard(res.data.card);
      else setSavedCard(null);
    } catch {
      setSavedCard(null);
    } finally {
      setLoadingCard(false);
    }
  };

  const checkGooglePay = async () => {
    if (Platform.OS !== "android") return;
    try {
      const supported = await isPlatformPaySupported({
        googlePay: { testEnv: true },
      });
      setGooglePayReady(supported);
    } catch {
      setGooglePayReady(false);
    }
  };

  // ── Płatność zapisaną kartą ──
  const handleSavedCardPayment = async () => {
    if (!savedCard) return;
    setProcessing(true);
    try {
      const res = await api.post("/api/stripe/payment-intent", {
        amountPLN,
        paymentMethodType: "card",
        paymentMethodId: savedCard.paymentMethodId,
      });

      const { error, paymentIntent } = await confirmPayment(res.data.clientSecret, {
        paymentMethodType: "Card",
        paymentMethodData: { paymentMethodId: savedCard.paymentMethodId },
      });

      if (error) {
        Alert.alert("Płatność nieudana", error.message);
        return;
      }

      if (paymentIntent?.status === "Succeeded") {
        onSuccess();
      }
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się przetworzyć płatności.");
    } finally {
      setProcessing(false);
    }
  };

  // ── Płatność BLIK (wizualna symulacja z prawdziwym flow kartą) ──
  const handleBlikPayment = async () => {
    if (blikCode.length !== 6) {
      Alert.alert("Błąd", "Wpisz 6-cyfrowy kod BLIK.");
      return;
    }
    setProcessing(false);
    setBlikWaiting(true);
    setBlikSeconds(60);

    // Symulacja oczekiwania na potwierdzenie w aplikacji bankowej
    let secondsLeft = 60;
    blikInterval.current = setInterval(() => {
      secondsLeft -= 1;
      setBlikSeconds(secondsLeft);
    }, 1000);

    // Po 3 sekundach symulujemy sukces (jak w prawdziwym BLIK po potwierdzeniu)
    blikTimeout.current = setTimeout(async () => {
      clearInterval(blikInterval.current!);
      setBlikWaiting(false);

      try {
        // Rzeczywista płatność przez backend
        const res = await api.post("/api/stripe/payment-intent", {
          amountPLN,
          paymentMethodType: "card",
          paymentMethodId: savedCard?.paymentMethodId,
        });

        if (savedCard) {
          const { error, paymentIntent } = await confirmPayment(res.data.clientSecret, {
            paymentMethodType: "Card",
            paymentMethodData: { paymentMethodId: savedCard.paymentMethodId },
          });
          if (error) {
            Alert.alert("Płatność nieudana", error.message);
            return;
          }
          if (paymentIntent?.status === "Succeeded") {
            onSuccess();
          }
        } else {
          // Brak karty — symulujemy sukces dla prototypu
          onSuccess();
        }
      } catch (e: any) {
        Alert.alert("Błąd", e.response?.data?.error || "Nie udało się przetworzyć płatności.");
      }
    }, 4000);
  };

  // ── Płatność Google Pay ──
  const handleGooglePayPayment = async () => {
    setProcessing(true);
    try {
      const res = await api.post("/api/stripe/payment-intent", {
        amountPLN,
        paymentMethodType: "google_pay",
      });

      const { error } = await confirmPlatformPayPayment(
        res.data.clientSecret,
        {
          googlePay: {
            testEnv: true,
            merchantName: "Subii",
            merchantCountryCode: "PL",
            currencyCode: "PLN",
            billingAddressConfig: {
              format: PlatformPay.BillingAddressFormat.Full,
              isPhoneNumberRequired: false,
              isRequired: false,
            },
          },
        }
      );

      if (error) {
        if (error.code !== "Canceled") {
          Alert.alert("Płatność nieudana", error.message);
        }
        setSelectedMethod(null);
        return;
      }

      onSuccess();
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się przetworzyć płatności.");
    } finally {
      setProcessing(false);
    }
  };

  // ── Płatność nową kartą ──
  const handleNewCardPayment = async () => {
    if (!newCardDetails?.complete) {
      Alert.alert("Błąd", "Uzupełnij wszystkie dane karty.");
      return;
    }
    setProcessing(true);
    try {
      const res = await api.post("/api/stripe/payment-intent", {
        amountPLN,
        paymentMethodType: "card",
      });

      const { error, paymentIntent } = await confirmPayment(res.data.clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        Alert.alert("Płatność nieudana", error.message);
        setProcessing(false);
        return;
      }

      if (paymentIntent?.status === "Succeeded") {
        setProcessing(false);
        Alert.alert(
          "Ustawić jako domyślną?",
          "Czy chcesz ustawić tę kartę jako domyślną metodę płatności do automatycznych rozliczeń?",
          [
            {
              text: "Nie, tylko ta płatność",
              style: "cancel",
              onPress: () => onSuccess(),
            },
            {
              text: "Tak, ustaw domyślną",
              onPress: async () => {
                try {
                  const pmId = paymentIntent.paymentMethodId;
                  if (pmId) {
                    await api.post("/api/stripe/save-payment-method", { paymentMethodId: pmId });
                  }
                } catch {}
                onSuccess();
              },
            },
          ]
        );
      }
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się przetworzyć płatności.");
      setProcessing(false);
    }
  };

  // ── Ekran oczekiwania BLIK ──
  if (blikWaiting) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, alignItems: "center", gap: 20 }}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#f0f9ff", justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: 36 }}>📱</Text>
              </View>
            </Animated.View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#000", textAlign: "center" }}>
              Potwierdź w aplikacji bankowej
            </Text>
            <Text style={{ fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22 }}>
              Otwórz aplikację swojego banku i potwierdź płatność BLIK.
            </Text>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: blikSeconds <= 10 ? "#fef2f2" : "#f9f9f9",
              justifyContent: "center", alignItems: "center",
              borderWidth: 2, borderColor: blikSeconds <= 10 ? "#fca5a5" : "#e0e0e0",
            }}>
              <Text style={{ fontSize: 24, fontWeight: "900", color: blikSeconds <= 10 ? "#dc2626" : "#000" }}>
                {blikSeconds}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: "#999" }}>sekund pozostało</Text>
            <Pressable
              onPress={() => {
                clearInterval(blikInterval.current!);
                clearTimeout(blikTimeout.current!);
                setBlikWaiting(false);
              }}
              style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: "#f0f0f0", borderRadius: 12 }}
            >
              <Text style={{ fontWeight: "600", color: "#333" }}>Anuluj</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Render główny ──
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}>

          {/* Nagłówek */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#000" }}>Wybierz metodę płatności</Text>
              <Text style={{ fontSize: 13, color: "#999", marginTop: 2 }}>{description} · {amountPLN.toFixed(2)} zł</Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#000" />
            </Pressable>
          </View>

          {/* Zapisana karta */}
          {loadingCard ? (
            <ActivityIndicator color="#000" />
          ) : savedCard ? (
            <Pressable
              onPress={() => setSelectedMethod(selectedMethod === "saved_card" ? null : "saved_card")}
              style={{
                padding: 16, borderRadius: 14, borderWidth: 2,
                borderColor: selectedMethod === "saved_card" ? "#000" : "#e0e0e0",
                backgroundColor: selectedMethod === "saved_card" ? "#f9f9f9" : "#fff",
                gap: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }}>
                    <Ionicons name="card" size={22} color="#000" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>
                      {savedCard.brand.toUpperCase()} •••• {savedCard.last4}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                      Wygasa {savedCard.expMonth.toString().padStart(2, "0")}/{savedCard.expYear} · Domyślna
                    </Text>
                  </View>
                </View>
                {selectedMethod === "saved_card" && (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </View>
              {selectedMethod === "saved_card" && (
                <Pressable
                  onPress={handleSavedCardPayment}
                  disabled={processing}
                  style={{ backgroundColor: "#000", padding: 14, borderRadius: 12, alignItems: "center", opacity: processing ? 0.6 : 1 }}
                >
                  {processing
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Zapłać {amountPLN.toFixed(2)} zł</Text>
                  }
                </Pressable>
              )}
            </Pressable>
          ) : null}

          {/* Google Pay — tylko Android */}
          {Platform.OS === "android" && googlePayReady && (
            <Pressable
              onPress={() => {
                setSelectedMethod("google_pay");
                handleGooglePayPayment();
              }}
              style={{
                padding: 16, borderRadius: 14, borderWidth: 2,
                borderColor: selectedMethod === "google_pay" ? "#000" : "#e0e0e0",
                backgroundColor: "#fff",
                flexDirection: "row", alignItems: "center", gap: 12,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: 20, fontWeight: "700" }}>G</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>Google Pay</Text>
                <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Zapłać przez Google Pay</Text>
              </View>
              {processing && selectedMethod === "google_pay" && <ActivityIndicator color="#000" size="small" />}
            </Pressable>
          )}

          {/* BLIK */}
          <Pressable
            onPress={() => setSelectedMethod(selectedMethod === "blik" ? null : "blik")}
            style={{
              padding: 16, borderRadius: 14, borderWidth: 2,
              borderColor: selectedMethod === "blik" ? "#000" : "#e0e0e0",
              backgroundColor: selectedMethod === "blik" ? "#f9f9f9" : "#fff",
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#e8f5e9", justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: "#2e7d32" }}>BLIK</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>BLIK</Text>
                  <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>6-cyfrowy kod z aplikacji bankowej</Text>
                </View>
              </View>
              {selectedMethod === "blik" && (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
            </View>
            {selectedMethod === "blik" && (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={blikCode}
                  onChangeText={(t) => setBlikCode(t.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{
                    borderWidth: 1.5,
                    borderColor: blikCode.length === 6 ? "#000" : "#e0e0e0",
                    borderRadius: 12, padding: 14, fontSize: 28, fontWeight: "800",
                    textAlign: "center", letterSpacing: 8, backgroundColor: "#fff",
                  }}
                />
                <Text style={{ fontSize: 11, color: "#999", textAlign: "center" }}>
                  Otwórz aplikację bankową i skopiuj kod BLIK
                </Text>
                <Pressable
                  onPress={handleBlikPayment}
                  disabled={processing || blikCode.length !== 6}
                  style={{
                    backgroundColor: blikCode.length === 6 ? "#000" : "#ccc",
                    padding: 14, borderRadius: 12, alignItems: "center",
                    opacity: processing ? 0.6 : 1,
                  }}
                >
                  {processing
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Zapłać {amountPLN.toFixed(2)} zł BLIK-iem</Text>
                  }
                </Pressable>
              </View>
            )}
          </Pressable>

          {/* Apple Pay — wkrótce */}
          <View style={{
            padding: 16, borderRadius: 14, borderWidth: 2,
            borderColor: "#e0e0e0", backgroundColor: "#fafafa",
            flexDirection: "row", alignItems: "center", gap: 12, opacity: 0.6,
          }}>
            <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
              <Ionicons name="logo-apple" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>Apple Pay</Text>
              <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Niedostępne na tym urządzeniu</Text>
            </View>
            <View style={{ backgroundColor: "#f0f0f0", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#999" }}>WKRÓTCE</Text>
            </View>
          </View>

          {/* Inna karta */}
          <Pressable
            onPress={() => setSelectedMethod(selectedMethod === "new_card" ? null : "new_card")}
            style={{
              padding: 16, borderRadius: 14, borderWidth: 2,
              borderColor: selectedMethod === "new_card" ? "#000" : "#e0e0e0",
              backgroundColor: selectedMethod === "new_card" ? "#f9f9f9" : "#fff",
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }}>
                  <MaterialIcons name="add-card" size={22} color="#000" />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#000" }}>
                    {savedCard ? "Zapłać inną kartą" : "Zapłać kartą"}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#999", marginTop: 2 }}>Visa, Mastercard i inne</Text>
                </View>
              </View>
              {selectedMethod === "new_card" && (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
            </View>
            {selectedMethod === "new_card" && (
              <View style={{ gap: 10 }}>
                <CardField
                  postalCodeEnabled={false}
                  placeholders={{ number: "1234 5678 9012 3456" }}
                  cardStyle={{
                    backgroundColor: "#fff",
                    textColor: "#000",
                    borderColor: "#e0e0e0",
                    borderWidth: 1,
                    borderRadius: 10,
                    fontSize: 15,
                  }}
                  style={{ width: "100%", height: 52 }}
                  onCardChange={(details) => setNewCardDetails(details)}
                />
                <Text style={{ fontSize: 11, color: "#999", textAlign: "center" }}>
                  🔒 Dane karty są szyfrowane przez Stripe
                </Text>
                <Pressable
                  onPress={handleNewCardPayment}
                  disabled={processing || !newCardDetails?.complete}
                  style={{
                    backgroundColor: newCardDetails?.complete ? "#000" : "#ccc",
                    padding: 14, borderRadius: 12, alignItems: "center",
                    opacity: processing ? 0.6 : 1,
                  }}
                >
                  {processing
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Zapłać {amountPLN.toFixed(2)} zł</Text>
                  }
                </Pressable>
              </View>
            )}
          </Pressable>

          {/* Stopka */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingBottom: 8 }}>
            <Ionicons name="lock-closed" size={12} color="#bbb" />
            <Text style={{ fontSize: 11, color: "#bbb" }}>Płatności obsługiwane przez Stripe · 256-bit SSL</Text>
          </View>

        </View>
      </View>
    </Modal>
  );
}