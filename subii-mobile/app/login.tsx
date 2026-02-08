// app/login.tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "../src/lib/api";
import { storage } from "../src/lib/storage";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Błąd", "Wypełnij wszystkie pola");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      
      await storage.setToken(res.token);
      await storage.setUser(res.user);
      
      Alert.alert("Sukces", "Zalogowano pomyślnie!");
      router.replace("/" as any);
    } catch (error: any) {
      const msg = error.response?.data?.error || "Błąd logowania";
      Alert.alert("Błąd", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 16, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 24 }}>Zaloguj się</Text>

      <View style={{ gap: 12 }}>
        <Text style={{ fontWeight: "600" }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="twoj@email.pl"
          keyboardType="email-address"
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 10,
            padding: 14,
            fontSize: 16
          }}
        />
      </View>

      <View style={{ gap: 12 }}>
        <Text style={{ fontWeight: "600" }}>Hasło</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 10,
            padding: 14,
            fontSize: 16
          }}
        />
      </View>

      <Pressable
        onPress={handleLogin}
        disabled={loading}
        style={{
          backgroundColor: "#000",
          padding: 16,
          borderRadius: 10,
          marginTop: 12,
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

      <Pressable onPress={() => router.push("/register" as any)} style={{ marginTop: 16 }}>
        <Text style={{ textAlign: "center", color: "#666" }}>
          Nie masz konta? <Text style={{ color: "#000", fontWeight: "600" }}>Zarejestruj się</Text>
        </Text>
      </Pressable>
    </View>
  );
}