import { useRouter } from "expo-router";
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
  Keyboard
} from "react-native";
import { authApi } from "../src/lib/api";
import { useAuth } from "../src/contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Błąd", "Wypełnij wszystkie pola");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Błąd", "Nieprawidłowy format emaila");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      await login(res.token, res.user);
    } catch (error: any) {
      const msg = error.response?.data?.error || "Błąd logowania";
      Alert.alert("Błąd", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 20, backgroundColor: "#fff" }}>
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <Text style={{ fontSize: 36, fontWeight: "900", marginBottom: 8 }}>
              Subii
            </Text>
            <Text style={{ fontSize: 16, color: "#666" }}>
              Zarządzaj swoimi subskrypcjami
            </Text>
          </View>

          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontWeight: "600", marginBottom: 8, fontSize: 14 }}>
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="twoj@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  backgroundColor: "#f9f9f9"
                }}
              />
            </View>

            <View>
              <Text style={{ fontWeight: "600", marginBottom: 8, fontSize: 14 }}>
                Hasło
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                style={{
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  backgroundColor: "#f9f9f9"
                }}
              />
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={{
                backgroundColor: "#000",
                padding: 18,
                borderRadius: 12,
                marginTop: 8,
                opacity: loading ? 0.6 : 1
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
            <Text style={{ color: "#666", marginBottom: 12 }}>
              Nie masz jeszcze konta?
            </Text>
            <Pressable onPress={() => router.push("/register" as any)}>
  <Text style={{ color: "#000", fontWeight: "700", fontSize: 16 }}>
    Zarejestruj się
  </Text>
</Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}