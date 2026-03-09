import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  Animated,
  Easing,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import {
  useStripe,
  CardField,
  usePlatformPay,
  PlatformPay,
} from "@stripe/stripe-react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  visible,
  onClose,
  onSuccess,
  amountPLN,
  description,
}: PaymentModalProps) {
  const { confirmPayment } = useStripe();
  const { isPlatformPaySupported, confirmPlatformPayPayment } =
    usePlatformPay();

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

  const WHITE = "#fff";
  const BLACK = "#252729";
  const MUTED = "#666";
  const SUBTLE = "#999";
  const PLACEHOLDER = "#bbb";
  const LIGHT_BG = "#f0f0f0";
  const INPUT_BG = "#f9f9f9";
  const NEAR_WHITE = "#fafafa";
  const BLUE_LIGHT = "#f0f9ff";
  const BORDER = "#e0e0e0";
  const ICON_COLOR = "#333";
  const DANGER = "#dc2626";
  const DANGER_BG = "#fef2f2";
  const DANGER_BORDER = "#fca5a5";
  const DISABLED = "#ccc";
  const DISABLED_BTN = "#999";

  const FONT_REGULAR = "Inter_400Regular";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";
  const FONT_EXTRABOLD = "Inter_800ExtraBold";
  const FONT_BLACK = "Inter_900Black";

  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [loadingCard, setLoadingCard] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<
    "saved_card" | "blik" | "google_pay" | "new_card" | null
  >(null);
  const [blikCode, setBlikCode] = useState("");
  const [newCardDetails, setNewCardDetails] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [blikWaiting, setBlikWaiting] = useState(false);
  const [blikSeconds, setBlikSeconds] = useState(60);
  const [googlePayReady, setGooglePayReady] = useState(false);

  const blikInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const blikTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      loadSavedCard();
      checkGooglePay();
    } else {
      resetState();
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (blikInterval.current) {
        clearInterval(blikInterval.current);
        blikInterval.current = null;
      }
      if (blikTimeout.current) {
        clearTimeout(blikTimeout.current);
        blikTimeout.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (blikWaiting) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
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

  const handleSavedCardPayment = async () => {
    if (!savedCard) return;
    setProcessing(true);
    try {
      const res = await api.post("/api/stripe/payment-intent", {
        amountPLN,
        paymentMethodType: "card",
        paymentMethodId: savedCard.paymentMethodId,
      });

      const { error, paymentIntent } = await confirmPayment(
        res.data.clientSecret,
        {
          paymentMethodType: "Card",
          paymentMethodData: { paymentMethodId: savedCard.paymentMethodId },
        }
      );

      if (error) {
        Alert.alert("Płatność nieudana", error.message);
        return;
      }

      if (paymentIntent?.status === "Succeeded") {
        onSuccess();
      }
    } catch (e: any) {
      Alert.alert(
        "Błąd",
        e.response?.data?.error || "Nie udało się przetworzyć płatności."
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleBlikPayment = async () => {
    if (blikCode.length !== 6) {
      Alert.alert("Błąd", "Wpisz 6-cyfrowy kod BLIK.");
      return;
    }
    setProcessing(false);
    setBlikWaiting(true);
    setBlikSeconds(60);

    let secondsLeft = 60;
    blikInterval.current = setInterval(() => {
      secondsLeft -= 1;
      setBlikSeconds(secondsLeft);
    }, 1000);

    blikTimeout.current = setTimeout(async () => {
      clearInterval(blikInterval.current!);
      setBlikWaiting(false);

      try {
        const res = await api.post("/api/stripe/payment-intent", {
          amountPLN,
          paymentMethodType: "card",
          paymentMethodId: savedCard?.paymentMethodId,
        });

        if (savedCard) {
          const { error, paymentIntent } = await confirmPayment(
            res.data.clientSecret,
            {
              paymentMethodType: "Card",
              paymentMethodData: {
                paymentMethodId: savedCard.paymentMethodId,
              },
            }
          );
          if (error) {
            Alert.alert("Płatność nieudana", error.message);
            return;
          }
          if (paymentIntent?.status === "Succeeded") {
            onSuccess();
          }
        } else {
          onSuccess();
        }
      } catch (e: any) {
        Alert.alert(
          "Błąd",
          e.response?.data?.error || "Nie udało się przetworzyć płatności."
        );
      }
    }, 4000);
  };

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
      Alert.alert(
        "Błąd",
        e.response?.data?.error || "Nie udało się przetworzyć płatności."
      );
    } finally {
      setProcessing(false);
    }
  };

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

      const { error, paymentIntent } = await confirmPayment(
        res.data.clientSecret,
        {
          paymentMethodType: "Card",
        }
      );

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
                    await api.post("/api/stripe/save-payment-method", {
                      paymentMethodId: pmId,
                    });
                  }
                } catch {}
                onSuccess();
              },
            },
          ]
        );
      }
    } catch (e: any) {
      Alert.alert(
        "Błąd",
        e.response?.data?.error || "Nie udało się przetworzyć płatności."
      );
      setProcessing(false);
    }
  };

  if (blikWaiting) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
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
              padding: 32,
              alignItems: "center",
              gap: 20,
            }}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: BLUE_LIGHT,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 36, fontFamily: FONT_REGULAR }}>
                  📱
                </Text>
              </View>
            </Animated.View>

            <Text
              style={{
                fontSize: 20,
                fontFamily: FONT_EXTRABOLD,
                color: BLACK,
                textAlign: "center",
              }}
            >
              Potwierdź w aplikacji bankowej
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: MUTED,
                textAlign: "center",
                lineHeight: 22,
                fontFamily: FONT_REGULAR,
              }}
            >
              Otwórz aplikację swojego banku i potwierdź płatność BLIK.
            </Text>

            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: blikSeconds <= 10 ? DANGER_BG : INPUT_BG,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: blikSeconds <= 10 ? DANGER_BORDER : BORDER,
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontFamily: FONT_BLACK,
                  color: blikSeconds <= 10 ? DANGER : BLACK,
                }}
              >
                {blikSeconds}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 12,
                color: SUBTLE,
                fontFamily: FONT_REGULAR,
              }}
            >
              sekund pozostało
            </Text>

            <Pressable
              onPress={() => {
                clearInterval(blikInterval.current!);
                clearTimeout(blikTimeout.current!);
                setBlikWaiting(false);
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: LIGHT_BG,
                borderRadius: 12,
              }}
            >
              <Text style={{ fontFamily: FONT_SEMI, color: ICON_COLOR }}>
                Anuluj
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <KeyboardAvoidingView
            style={{ flex: 1, justifyContent: "flex-end" }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <View
              style={{
                backgroundColor: WHITE,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                gap: 10,
                maxHeight: "100%",
              }}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 18 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 20,
                        fontFamily: FONT_BOLD,
                        color: BLACK,
                        marginBottom: 6,
                      }}
                    >
                      Wybierz metodę płatności
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: MUTED,
                        marginBottom: 16,
                        fontFamily: FONT_REGULAR,
                      }}
                    >
                      {description} · {amountPLN.toFixed(2)} zł
                    </Text>
                  </View>

                  <Pressable onPress={onClose} style={{ padding: 4 }}>
                    <Ionicons name="close" size={24} color={BLACK} />
                  </Pressable>
                </View>

                {loadingCard ? (
                  <ActivityIndicator color={BLACK} />
                ) : savedCard ? (
                  <Pressable
                    onPress={() =>
                      setSelectedMethod(
                        selectedMethod === "saved_card" ? null : "saved_card"
                      )
                    }
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor:
                        selectedMethod === "saved_card" ? BLACK : BORDER,
                      backgroundColor:
                        selectedMethod === "saved_card" ? INPUT_BG : WHITE,
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: LIGHT_BG,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons name="card" size={22} color={ICON_COLOR} />
                        </View>

                        <View>
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: FONT_BOLD,
                              color: BLACK,
                              marginBottom: 2,
                            }}
                          >
                            {savedCard.brand.toUpperCase()} ····{" "}
                            {savedCard.last4}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: FONT_REGULAR,
                              color: MUTED,
                              marginBottom: 2,
                            }}
                          >
                            Wygasa{" "}
                            {savedCard.expMonth.toString().padStart(2, "0")}/
                            {savedCard.expYear} · Domyślna
                          </Text>
                        </View>
                      </View>

                      {selectedMethod === "saved_card" && (
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: BLACK,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={WHITE}
                          />
                        </View>
                      )}
                    </View>

                    {selectedMethod === "saved_card" && (
                      <Pressable
                        onPress={handleSavedCardPayment}
                        disabled={processing}
                        style={{
                          backgroundColor: BLACK,
                          paddingVertical: 12,
                          borderRadius: 12,
                          alignItems: "center",
                          opacity: processing ? 0.6 : 1,
                        }}
                      >
                        {processing ? (
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
                            Zapłać {amountPLN.toFixed(2)} zł
                          </Text>
                        )}
                      </Pressable>
                    )}
                  </Pressable>
                ) : null}

                {Platform.OS === "android" && googlePayReady && (
                  <Pressable
                    onPress={() => {
                      setSelectedMethod("google_pay");
                      handleGooglePayPayment();
                    }}
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      borderWidth: 2,
                      borderColor:
                        selectedMethod === "google_pay" ? BLACK : BORDER,
                      backgroundColor: WHITE,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        backgroundColor: LIGHT_BG,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{ fontSize: 20, fontFamily: FONT_BOLD }}
                      >
                        G
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: FONT_BOLD,
                          color: BLACK,
                          marginBottom: 2,
                        }}
                      >
                        Google Pay
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: FONT_REGULAR,
                          color: MUTED,
                          marginBottom: 2,
                        }}
                      >
                        Zapłać przez Google Pay
                      </Text>
                    </View>

                    {processing && selectedMethod === "google_pay" && (
                      <ActivityIndicator color={BLACK} size="small" />
                    )}
                  </Pressable>
                )}

                <Pressable
                  onPress={() =>
                    setSelectedMethod(
                      selectedMethod === "blik" ? null : "blik"
                    )
                  }
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: selectedMethod === "blik" ? BLACK : BORDER,
                    backgroundColor:
                      selectedMethod === "blik" ? INPUT_BG : WHITE,
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          backgroundColor: LIGHT_BG,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontFamily: FONT_BLACK,
                            color: ICON_COLOR,
                          }}
                        >
                          BLIK
                        </Text>
                      </View>

                      <View>
                        <Text
                          style={{
                            fontSize: 13,
                            fontFamily: FONT_BOLD,
                            color: BLACK,
                            marginBottom: 2,
                          }}
                        >
                          BLIK
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: FONT_REGULAR,
                            color: MUTED,
                            marginBottom: 2,
                          }}
                        >
                          6-cyfrowy kod z aplikacji bankowej
                        </Text>
                      </View>
                    </View>

                    {selectedMethod === "blik" && (
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: BLACK,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="checkmark" size={14} color={WHITE} />
                      </View>
                    )}
                  </View>

                  {selectedMethod === "blik" && (
                    <View style={{ gap: 10 }}>
                      <TextInput
                        value={blikCode}
                        onChangeText={(t) =>
                          setBlikCode(t.replace(/\D/g, "").slice(0, 6))
                        }
                        placeholder="000000"
                        keyboardType="number-pad"
                        maxLength={6}
                        style={{
                          borderWidth: 1.5,
                          borderColor:
                            blikCode.length === 6 ? BLACK : SUBTLE,
                          borderRadius: 12,
                          padding: 14,
                          fontSize: 28,
                          fontFamily: FONT_EXTRABOLD,
                          textAlign: "center",
                          letterSpacing: 8,
                          backgroundColor: WHITE,
                        }}
                      />

                      <Text
                        style={{
                          fontSize: 11,
                          color: SUBTLE,
                          textAlign: "center",
                          fontFamily: FONT_REGULAR,
                        }}
                      >
                        Otwórz aplikację bankową i skopiuj kod BLIK
                      </Text>

                      <Pressable
                        onPress={handleBlikPayment}
                        disabled={processing || blikCode.length !== 6}
                        style={{
                          backgroundColor:
                            blikCode.length === 6 ? BLACK : DISABLED_BTN,
                          paddingVertical: 12,
                          borderRadius: 12,
                          alignItems: "center",
                          opacity: processing ? 0.6 : 1,
                        }}
                      >
                        {processing ? (
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
                            Zapłać BLIK {amountPLN.toFixed(2)} zł
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  )}
                </Pressable>

                <View
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: BORDER,
                    backgroundColor: NEAR_WHITE,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    opacity: 0.6,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: LIGHT_BG,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="logo-apple"
                      size={22}
                      color={ICON_COLOR}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontFamily: FONT_BOLD,
                        color: BLACK,
                      }}
                    >
                      Apple Pay
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: FONT_REGULAR,
                        color: MUTED,
                        marginBottom: 2,
                      }}
                    >
                      Niedostępne
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: LIGHT_BG,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: FONT_BOLD,
                        color: BLACK,
                      }}
                    >
                      WKRÓTCE
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor:
                      selectedMethod === "new_card" ? BLACK : BORDER,
                    backgroundColor:
                      selectedMethod === "new_card" ? INPUT_BG : WHITE,
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <Pressable
                    onPress={() =>
                      setSelectedMethod(
                        selectedMethod === "new_card" ? null : "new_card"
                      )
                    }
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            backgroundColor: LIGHT_BG,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <MaterialIcons
                            name="add-card"
                            size={22}
                            color={ICON_COLOR}
                          />
                        </View>

                        <View>
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: FONT_BOLD,
                              color: BLACK,
                              marginBottom: 2,
                            }}
                          >
                            {savedCard ? "Zapłać inną kartą" : "Zapłać kartą"}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: FONT_REGULAR,
                              color: MUTED,
                              marginBottom: 2,
                            }}
                          >
                            Visa, Mastercard i inne
                          </Text>
                        </View>
                      </View>

                      {selectedMethod === "new_card" && (
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: BLACK,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={WHITE}
                          />
                        </View>
                      )}
                    </View>
                  </Pressable>

                  {selectedMethod === "new_card" && (
                    <View style={{ gap: 10 }}>
                      <CardField
                        postalCodeEnabled={false}
                        placeholders={{ number: "1234 5678 9012 3456" }}
                        cardStyle={{
                          backgroundColor: WHITE,
                          textColor: BLACK,
                          borderColor: BORDER,
                          borderWidth: 1,
                          borderRadius: 12,
                          fontSize: 15,
                        }}
                        style={{ width: "100%", height: 52 }}
                        onCardChange={(details) => setNewCardDetails(details)}
                      />

                      <Pressable
                        onPress={handleNewCardPayment}
                        disabled={processing || !newCardDetails?.complete}
                        style={{
                          backgroundColor: newCardDetails?.complete
                            ? BLACK
                            : DISABLED,
                          paddingVertical: 12,
                          borderRadius: 12,
                          alignItems: "center",
                          opacity: processing ? 0.6 : 1,
                        }}
                      >
                        {processing ? (
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
                            Zapłać {amountPLN.toFixed(2)} zł
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingBottom: 8,
                  }}
                >
                  <Ionicons name="lock-closed" size={12} color={PLACEHOLDER} />
                  <Text
                    style={{
                      fontSize: 11,
                      color: PLACEHOLDER,
                      fontFamily: FONT_REGULAR,
                    }}
                  >
                    Płatności obsługiwane przez Stripe · 256-bit SSL
                  </Text>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}