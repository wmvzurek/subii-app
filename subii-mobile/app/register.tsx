// app/register.tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "../src/lib/api";
import { storage } from "../src/lib/storage";

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    username: "",
    dateOfBirth: "",
    phone: ""
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const { email, password, firstName, lastName, username, dateOfBirth } = form;

    if (!email || !password || !firstName || !lastName || !username || !dateOfBirth) {
      Alert.alert("Błąd", "Wypełnij wszystkie wymagane pola");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register(form);
      
      await storage.setToken(res.token);
      await storage.setUser(res.user);
      
      Alert.alert("Sukces", "Konto utworzone!");
      router.replace("/" as any);
    } catch (error: any) {
      const msg = error.response?.data?.error || "Błąd rejestracji";
      Alert.alert("Błąd", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 8 }}>Utwórz konto</Text>

      <InputField label="Email *" value={form.email} onChangeText={(v) => setForm({...form, email: v})} keyboardType="email-address" />
      <InputField label="Hasło *" value={form.password} onChangeText={(v) => setForm({...form, password: v})} secureTextEntry />
      <InputField label="Imię *" value={form.firstName} onChangeText={(v) => setForm({...form, firstName: v})} />
      <InputField label="Nazwisko *" value={form.lastName} onChangeText={(v) => setForm({...form, lastName: v})} />
      <InputField label="Nazwa użytkownika *" value={form.username} onChangeText={(v) => setForm({...form, username: v})} />
      <InputField label="Data urodzenia * (YYYY-MM-DD)" value={form.dateOfBirth} onChangeText={(v) => setForm({...form, dateOfBirth: v})} placeholder="1995-05-15" />
      <InputField label="Telefon" value={form.phone} onChangeText={(v) => setForm({...form, phone: v})} keyboardType="phone-pad" />

      <Pressable
        onPress={handleRegister}
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
            Zarejestruj się
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
        <Text style={{ textAlign: "center", color: "#666" }}>
          Masz już konto? <Text style={{ color: "#000", fontWeight: "600" }}>Zaloguj się</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function InputField({ label, ...props }: any) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "600" }}>{label}</Text>
      <TextInput
        {...props}
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
  );
}