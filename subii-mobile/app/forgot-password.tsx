import { useState } from "react";
import {
  View, Text, TextInput, Pressable,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ForgotPassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert("Błąd", "Podaj adres email");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      Alert.alert("Błąd", "Podaj prawidłowy adres email");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: trimmed });
      setSent(true);
    } catch {
      // Zawsze pokazujemy sukces — nie zdradzamy czy email istnieje
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", padding: 24, paddingTop: insets.top + 16, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 48, marginBottom: 24 }}>📧</Text>
        <Text style={{ fontSize: 24, fontWeight: "900", color: "#000", textAlign: "center", marginBottom: 12 }}>
          Sprawdź swoją skrzynkę
        </Text>
        <Text style={{ fontSize: 15, color: "#666", textAlign: "center", lineHeight: 24, marginBottom: 32 }}>
          Jeśli konto o podanym adresie istnieje, wysłaliśmy link do resetowania hasła.
          {"\n\n"}Link będzie ważny przez 24 godziny.
        </Text>
        <Pressable
          onPress={() => router.replace("/login" as any)}
          style={{ padding: 18, backgroundColor: "#000", borderRadius: 14, width: "100%", alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Wróć do logowania</Text>
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
        <Pressable onPress={() => router.back()} style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 28 }}>←</Text>
        </Pressable>

        <Text style={{ fontSize: 28, fontWeight: "900", color: "#000", marginBottom: 8 }}>
          Nie pamiętasz hasła?
        </Text>
        <Text style={{ fontSize: 15, color: "#666", lineHeight: 24, marginBottom: 32 }}>
          Wpisz adres email przypisany do konta. Wyślemy Ci link do ustawienia nowego hasła.
        </Text>

        <Text style={{ fontSize: 13, color: "#999", fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Adres email
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="jan@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1.5,
            borderColor: "#e0e0e0",
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            marginBottom: 24,
            backgroundColor: "#fafafa",
          }}
        />

        <Pressable
          onPress={handleSend}
          disabled={loading}
          style={{
            padding: 18,
            backgroundColor: loading ? "#ccc" : "#000",
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              Wyślij link resetujący
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}