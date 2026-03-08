import { useState } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ResetPassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  // ====== STYLE (UI ONLY) ======
  const BG = "#fff";
  const MUTED = "#666";
  const BLACK = "#252729";
  const BORDER = "#ddd";
  const INPUT_BG = "#f9f9f9";

  // dodatkowe stałe (porządek)
  const WHITE = "#fff";
  const PLACEHOLDER = "#9a9a9a";
  const SUCCESS = "#47c073";
  const ERROR_RED = "#e44343";
  const OK_GREEN = "#16a34a";
  const BAD_RED = "#dc2626";

  // ====== FONTS (Inter) ======
  const FONT_LIGHT = "Inter_300Light";
  const FONT_REG = "Inter_400Regular";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";

  const checks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
  };

  const allChecksPassed = Object.values(checks).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleReset = async () => {
    if (!allChecksPassed) {
      Alert.alert("Słabe hasło", "Hasło nie spełnia wszystkich wymagań");
      return;
    }
    if (!passwordsMatch) {
      Alert.alert("Błąd", "Hasła nie są identyczne");
      return;
    }
    if (!token) {
      Alert.alert("Błąd", "Brak tokenu resetowania hasła");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, newPassword });
      setDone(true);
    } catch (e: any) {
      const msg =
        e.response?.data?.error || "Nie udało się zmienić hasła. Link mógł wygasnąć.";
      Alert.alert("Błąd", msg);
    } finally {
      setLoading(false);
    }
  };

  // ===== SUCCESS SCREEN =====
  if (done) {
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
          name="checkmark-circle-outline"
          size={52}
          color={MUTED}
          style={{ marginBottom: 20 }}
        />

        <Text
          style={{
            fontSize: 20,
            color: BLACK,
            textAlign: "center",
            marginBottom: 8,
            fontFamily: FONT_SEMI,
          }}
        >
          Hasło zmienione!
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
          Zaloguj się używając nowego hasła.
        </Text>

        <Pressable
          onPress={() => router.replace("/login" as any)}
          style={{
            paddingVertical: 16,
            backgroundColor: BLACK,
            borderRadius: 12,
            width: "100%",
            alignItems: "center",
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
            Przejdź do logowania
          </Text>
        </Pressable>
      </View>
    );
  }

  // ===== MAIN SCREEN =====
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
          <Text
            style={{
              fontSize: 25,
              color: BLACK,
              textAlign: "center",
              marginBottom: 8,
              fontFamily: FONT_LIGHT,
            }}
          >
            Nowe hasło
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: MUTED,
              marginBottom: 18,
              textAlign: "center",
              fontFamily: FONT_LIGHT,
            }}
          >
            Wpisz nowe hasło do swojego konta.
          </Text>

          {/* NOWE HASŁO */}
          <View
            style={{
              borderWidth: 1,
              borderColor: BORDER,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
              backgroundColor: INPUT_BG,
            }}
          >
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nowe hasło"
              placeholderTextColor={PLACEHOLDER}
              secureTextEntry={!showNew}
              style={{
                flex: 1,
                paddingVertical: 14,
                paddingHorizontal: 14,
                fontSize: 14,
                color: BLACK,
                fontFamily: FONT_LIGHT,
              }}
            />

            <Pressable onPress={() => setShowNew(!showNew)} style={{ paddingHorizontal: 14 }}>
              <Ionicons
                name={showNew ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={PLACEHOLDER}
              />
            </Pressable>
          </View>

          {/* WYMAGANIA */}
          {newPassword.length > 0 && (
            <View
              style={{
                backgroundColor: INPUT_BG,
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
              }}
            >
              {[
                { key: "length", label: "Min. 8 znaków" },
                { key: "upper", label: "Wielka litera" },
                { key: "lower", label: "Mała litera" },
                { key: "number", label: "Cyfra" },
                { key: "special", label: "Znak specjalny" },
              ].map(({ key, label }) => {
                const met = checks[key as keyof typeof checks];
                return (
                  <Text
                    key={key}
                    style={{
                      fontSize: 12,
                      color: met ? SUCCESS : ERROR_RED,
                      marginBottom: 4,
                      fontFamily: FONT_REG,
                    }}
                  >
                    {met ? "✓" : "✕"} {label}
                  </Text>
                );
              })}
            </View>
          )}

          {/* POWTÓRZ HASŁO */}
          <View
            style={{
              borderWidth: 1,
              borderColor: BORDER,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
              backgroundColor: INPUT_BG,
            }}
          >
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Powtórz hasło"
              placeholderTextColor={PLACEHOLDER}
              secureTextEntry={!showConfirm}
              style={{
                flex: 1,
                paddingVertical: 14,
                paddingHorizontal: 14,
                fontSize: 14,
                color: BLACK,
                fontFamily: FONT_LIGHT,
              }}
            />

            <Pressable onPress={() => setShowConfirm(!showConfirm)} style={{ paddingHorizontal: 14 }}>
              <Ionicons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={PLACEHOLDER}
              />
            </Pressable>
          </View>

          {confirmPassword.length > 0 && (
            <Text
              style={{
                fontSize: 12,
                color: passwordsMatch ? OK_GREEN : BAD_RED,
                marginBottom: 16,
                fontFamily: FONT_REG,
              }}
            >
              {passwordsMatch ? "✓ Hasła są identyczne" : "✕ Hasła nie są identyczne"}
            </Text>
          )}

          <Pressable
            onPress={handleReset}
            disabled={loading || !allChecksPassed || !passwordsMatch}
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
                Ustaw nowe hasło
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}