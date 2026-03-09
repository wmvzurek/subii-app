import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { api } from "../src/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateEmail = (email: string) => EMAIL_RE.test(email);

export default function ForgotPassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const BG = "#fff";
  const WHITE = "#fff";
  const BLACK = "#252729";
  const MUTED = "#666";
  const BORDER = "#ddd";
  const INPUT_BG = "#f9f9f9";
  const PLACEHOLDER = "#9a9a9a";

  const FONT_THIN = "Inter_100Thin";
  const FONT_EXTRA_LIGHT = "Inter_200ExtraLight";
  const FONT_LIGHT = "Inter_300Light";
  const FONT_REGULAR = "Inter_400Regular";
  const FONT_MEDIUM = "Inter_500Medium";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";
  const FONT_EXTRA_BOLD = "Inter_800ExtraBold";
  const FONT_BLACK = "Inter_900Black";

  const handleSend = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      Alert.alert("Błąd", "Podaj adres email");
      return;
    }

    if (!validateEmail(trimmed)) {
      Alert.alert("Błąd", "Podaj prawidłowy adres email");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: trimmed });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  }, [email]);

  if (sent) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: BG,
          padding: 24,
          paddingTop: insets.top + 16,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons
          name="mail-outline"
          size={55}
          color={MUTED}
          style={{ marginBottom: 18 }}
        />

        <Text
          style={{
            fontSize: 20,
            color: BLACK,
            textAlign: "center",
            marginBottom: 10,
            fontFamily: FONT_SEMI,
          }}
        >
          Sprawdź swoją skrzynkę
        </Text>

        <Text
          style={{
            fontSize: 13,
            color: MUTED,
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 24,
            fontFamily: FONT_LIGHT,
          }}
        >
          Jeśli konto o podanym adresie istnieje, wysłaliśmy link do resetowania hasła.
          {"\n\n"}Link będzie ważny przez 24 godziny.
        </Text>

        <Pressable
          onPress={() => router.replace("/login" as any)}
          style={{
            paddingVertical: 16,
            borderRadius: 12,
            width: "100%",
            alignItems: "center",
            backgroundColor: BLACK,
          }}
        >
          <Text
            style={{
              color: WHITE,
              fontSize: 15,
              fontFamily: FONT_BOLD,
            }}
          >
            Wróć do logowania
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: insets.top + 16,
            paddingBottom: 28,
            backgroundColor: BG,
            justifyContent: "flex-start",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              height: 44,
              justifyContent: "center",
              position: "relative",
              marginBottom: 16,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={{
                position: "absolute",
                left: 0,
                height: 44,
                width: 44,
                justifyContent: "center",
                alignItems: "flex-start",
              }}
              hitSlop={10}
            >
              <Text
                style={{
                  fontSize: 26,
                  color: BLACK,
                  fontFamily: FONT_LIGHT,
                }}
              >
                ←
              </Text>
            </Pressable>

            <Text
              style={{
                fontSize: 25,
                color: BLACK,
                fontFamily: FONT_LIGHT,
                textAlign: "center",
              }}
            >
              Nie pamiętasz hasła?
            </Text>
          </View>

          <Text
            style={{
              fontSize: 14,
              color: MUTED,
              lineHeight: 18,
              fontFamily: FONT_LIGHT,
              marginBottom: 14,
              textAlign: "left",
            }}
          >
            Wpisz adres email przypisany do konta. Wyślemy Ci link do ustawienia nowego hasła.
          </Text>

          <View style={{ gap: 6, marginBottom: 14 }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={PLACEHOLDER}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSend}
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
          </View>

          <Pressable
            onPress={handleSend}
            disabled={loading}
            style={{
              backgroundColor: BLACK,
              paddingVertical: 16,
              borderRadius: 12,
              marginTop: 6,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text
                style={{
                  color: WHITE,
                  textAlign: "center",
                  fontFamily: FONT_BOLD,
                  fontSize: 15,
                }}
              >
                Wyślij
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}