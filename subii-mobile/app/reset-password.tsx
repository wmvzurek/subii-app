import { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
      const msg = e.response?.data?.error || "Nie udało się zmienić hasła. Link mógł wygasnąć.";
      Alert.alert("Błąd", msg);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", padding: 24, paddingTop: insets.top + 16, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 48, marginBottom: 24 }}>✅</Text>
        <Text style={{ fontSize: 24, fontWeight: "900", color: "#000", textAlign: "center", marginBottom: 12 }}>
          Hasło zmienione!
        </Text>
        <Text style={{ fontSize: 15, color: "#666", textAlign: "center", lineHeight: 24, marginBottom: 32 }}>
          Możesz teraz zalogować się nowym hasłem.
        </Text>
        <Pressable
          onPress={() => router.replace("/login" as any)}
          style={{ padding: 18, backgroundColor: "#000", borderRadius: 14, width: "100%", alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Przejdź do logowania</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={{ flex: 1, padding: 24, paddingTop: insets.top + 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "900", color: "#000", marginBottom: 8 }}>
          Nowe hasło
        </Text>
        <Text style={{ fontSize: 15, color: "#666", lineHeight: 24, marginBottom: 24 }}>
          Wpisz nowe hasło do swojego konta.
        </Text>

        {/* Pole nowe hasło */}
        <View style={{ borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12, flexDirection: "row", alignItems: "center", marginBottom: 12, backgroundColor: "#fafafa" }}>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Nowe hasło"
            secureTextEntry={!showNew}
            style={{ flex: 1, padding: 16, fontSize: 16 }}
          />
          <Pressable onPress={() => setShowNew(!showNew)} style={{ padding: 16 }}>
            <Text style={{ color: "#999" }}>{showNew ? "Ukryj" : "Pokaż"}</Text>
          </Pressable>
        </View>

        {/* Wymagania hasła */}
        {newPassword.length > 0 && (
          <View style={{ backgroundColor: "#f5f5f5", borderRadius: 10, padding: 12, marginBottom: 12, gap: 4 }}>
            {[
              { key: "length", label: "Min. 8 znaków" },
              { key: "upper", label: "Wielka litera" },
              { key: "lower", label: "Mała litera" },
              { key: "number", label: "Cyfra" },
              { key: "special", label: "Znak specjalny" },
            ].map(({ key, label }) => (
              <Text key={key} style={{ fontSize: 13, color: checks[key as keyof typeof checks] ? "#16a34a" : "#dc2626" }}>
                {checks[key as keyof typeof checks] ? "✓" : "✗"} {label}
              </Text>
            ))}
          </View>
        )}

        {/* Powtórz hasło */}
        <View style={{ borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12, flexDirection: "row", alignItems: "center", marginBottom: 24, backgroundColor: "#fafafa" }}>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Powtórz hasło"
            secureTextEntry={!showConfirm}
            style={{ flex: 1, padding: 16, fontSize: 16 }}
          />
          <Pressable onPress={() => setShowConfirm(!showConfirm)} style={{ padding: 16 }}>
            <Text style={{ color: "#999" }}>{showConfirm ? "Ukryj" : "Pokaż"}</Text>
          </Pressable>
        </View>

        {confirmPassword.length > 0 && (
          <Text style={{ fontSize: 13, color: passwordsMatch ? "#16a34a" : "#dc2626", marginBottom: 16, marginTop: -16 }}>
            {passwordsMatch ? "✓ Hasła są identyczne" : "✗ Hasła nie są identyczne"}
          </Text>
        )}

        <Pressable
          onPress={handleReset}
          disabled={loading || !allChecksPassed || !passwordsMatch}
          style={{
            padding: 18,
            backgroundColor: loading || !allChecksPassed || !passwordsMatch ? "#ccc" : "#000",
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              Ustaw nowe hasło
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
