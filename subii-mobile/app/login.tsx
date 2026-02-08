// app/login.tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "../src/lib/api";
import { storage } from "../src/lib/storage";
import { KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from "react-native";

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
  <KeyboardAvoidingView 
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    style={{ flex: 1 }}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 16, backgroundColor: "#fff" }}>
        {/* reszta kodu bez zmian */}
      </View>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
);
}