import { useRouter } from "expo-router";
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
import { authApi } from "../src/lib/api";
import { useAuth } from "../src/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

type Errors = {
  email?: string;
  password?: string;
};

type Touched = {
  email?: boolean;
  password?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateEmail = (email: string) => EMAIL_RE.test(email);

function getErrors(f: { email: string; password: string }): Errors {
  const e: Errors = {};
  if (!f.email.trim()) e.email = "Podaj email";
  else if (!validateEmail(f.email)) e.email = "Nieprawidłowy adres email";

  if (!f.password) e.password = "Podaj hasło";
  return e;
}

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Touched>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validateField = useCallback(
    (field: keyof Errors) => {
      const all = getErrors(form);
      const next = all[field];

      setErrors((prev) => {
        if (prev[field] === next) return prev;
        return { ...prev, [field]: next };
      });
    },
    [form]
  );

  const touchAndValidate = useCallback(
    (field: keyof Errors) => {
      setTouched((t) => ({ ...t, [field]: true }));
      validateField(field);
    },
    [validateField]
  );

  const canShowError = useCallback(
    (field: keyof Errors) => submitAttempted || !!touched[field],
    [submitAttempted, touched]
  );

  const handleLogin = useCallback(async () => {
    setSubmitAttempted(true);
    setTouched({ email: true, password: true });

    const all = getErrors(form);
    setErrors(all);

    if (Object.values(all).some(Boolean)) return;

    setLoading(true);
    try {
      const res = await authApi.login(form.email, form.password);
      await login(res.token, res.user);
    } catch (error: any) {
      const msg = error.response?.data?.error || "Błąd logowania";
      Alert.alert("Błąd", msg);
    } finally {
      setLoading(false);
    }
  }, [form, login]);

  const showEmailError = canShowError("email") && !!errors.email;
  const showPasswordError = canShowError("password") && !!errors.password;

  const BG = "#fff";
  const MUTED = "#666";
  const BLACK = "#252729";
  const BORDER = "#ddd";
  const INPUT_BG = "#f9f9f9";
  const ERROR = "#e44343";

  const FONT_LIGHT = "Inter_300Light";
  const FONT_REGULAR = "Inter_400Regular";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: BG }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 32,
            paddingBottom: 28,
            justifyContent: "center",
            backgroundColor: BG,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: "center", marginBottom: 28 }}>
            <Text
              style={{
                fontSize: 40,
                letterSpacing: 9,
                color: BLACK,
                fontFamily: FONT_LIGHT,
                marginBottom: 10,
              }}
            >
              Subii
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: MUTED,
                fontFamily: FONT_LIGHT,
              }}
            >
              Zarządzaj swoimi subskrypcjami
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ gap: 6 }}>
              <TextInput
                value={form.email}
                onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
                onBlur={() => touchAndValidate("email")}
                placeholder="Email"
                placeholderTextColor="#9a9a9a"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                style={{
                  borderWidth: 1,
                  borderColor: showEmailError ? ERROR : BORDER,
                  borderRadius: 10,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  fontSize: 14,
                  backgroundColor: INPUT_BG,
                  color: BLACK,
                  fontFamily: FONT_LIGHT,
                }}
              />
              {showEmailError ? (
                <Text style={{ color: ERROR, fontSize: 12, fontFamily: FONT_REGULAR }}>
                  {errors.email}
                </Text>
              ) : null}
            </View>

            <View style={{ gap: 6 }}>
              <View style={{ position: "relative" }}>
                <TextInput
                  value={form.password}
                  onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
                  onBlur={() => touchAndValidate("password")}
                  placeholder="Hasło"
                  placeholderTextColor="#9a9a9a"
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  style={{
                    borderWidth: 1,
                    borderColor: showPasswordError ? ERROR : BORDER,
                    borderRadius: 10,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    paddingRight: 44,
                    fontSize: 14,
                    backgroundColor: INPUT_BG,
                    color: BLACK,
                    fontFamily: FONT_LIGHT,
                  }}
                />

                <Pressable
                  onPress={() => setShowConfirm((v) => !v)}
                  hitSlop={10}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: 0,
                    bottom: 0,
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#9a9a9a"
                  />
                </Pressable>
              </View>

              {showPasswordError ? (
                <Text style={{ color: ERROR, fontSize: 12, fontFamily: FONT_REGULAR }}>
                  {errors.password}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={handleLogin}
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
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{
                    color: "#fff",
                    textAlign: "center",
                    fontFamily: FONT_BOLD,
                    fontSize: 15,
                  }}
                >
                  Zaloguj się
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push("/forgot-password" as any)}
              style={{ alignItems: "center", marginTop: 14 }}
            >
              <Text style={{ fontSize: 13, color: MUTED, fontFamily: FONT_LIGHT }}>
                Nie pamiętasz hasła?{" "}
                <Text style={{ color: BLACK, fontFamily: FONT_SEMI }}>
                  Resetuj
                </Text>
              </Text>
            </Pressable>

            <View
              style={{
                marginTop: 18,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, height: 1, backgroundColor: "#e6e6e6" }} />
              <Text style={{ color: "#9a9a9a", fontSize: 12, fontFamily: FONT_LIGHT }}>
                lub
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#e6e6e6" }} />
            </View>

            <Pressable
              onPress={() => router.push("/register" as any)}
              style={{ alignItems: "center", marginTop: 14 }}
            >
              <Text style={{ fontSize: 13, color: MUTED, fontFamily: FONT_LIGHT }}>
                Nie masz jeszcze konta?{" "}
                <Text style={{ color: BLACK, fontFamily: FONT_SEMI }}>
                  Zarejestruj się
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}