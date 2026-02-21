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
} from "react-native";
import { authApi } from "../src/lib/api";
import { useAuth } from "../src/contexts/AuthContext";

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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 20, backgroundColor: "#fff" }}>
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <Text style={{ fontSize: 36, fontWeight: "900", marginBottom: 8 }}>Subii</Text>
            <Text style={{ fontSize: 16, color: "#666" }}>Zarządzaj swoimi subskrypcjami</Text>
          </View>

          <View style={{ gap: 16 }}>
            {/* EMAIL */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "600", fontSize: 14 }}>Email</Text>
              <TextInput
                value={form.email}
                onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
                onBlur={() => touchAndValidate("email")}
                placeholder="twoj@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                style={{
                  borderWidth: 1,
                  borderColor: showEmailError ? "#ff4444" : "#ddd",
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  backgroundColor: "#f9f9f9",
                }}
              />
              {showEmailError ? <Text style={{ color: "#ff4444", fontSize: 12 }}>{errors.email}</Text> : null}
            </View>

            {/* PASSWORD */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "600", fontSize: 14 }}>Hasło</Text>
              <TextInput
                value={form.password}
                onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
                onBlur={() => touchAndValidate("password")}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={{
                  borderWidth: 1,
                  borderColor: showPasswordError ? "#ff4444" : "#ddd",
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  backgroundColor: "#f9f9f9",
                }}
              />
              {showPasswordError ? (
                <Text style={{ color: "#ff4444", fontSize: 12 }}>{errors.password}</Text>
              ) : null}
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={{
                backgroundColor: "#000",
                padding: 18,
                borderRadius: 12,
                marginTop: 8,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 16 }}>
                  Zaloguj się
                </Text>
              )}
            </Pressable>
          </View>

          <View style={{ marginTop: 24, alignItems: "center" }}>
            <Text style={{ color: "#666", marginBottom: 12 }}>Nie masz jeszcze konta?</Text>
            <Pressable onPress={() => router.push("/register" as any)}>
              <Text style={{ color: "#000", fontWeight: "700", fontSize: 16 }}>Zarejestruj się</Text>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}