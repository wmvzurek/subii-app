import { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  Alert, 
  ActivityIndicator, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "../src/lib/api";
import { storage } from "../src/lib/storage";

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);

  // Walidacja email
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Walidacja hasła
  const validatePassword = (password: string) => {
    // Min. 8 znaków, 1 wielka, 1 mała, 1 cyfra
    if (password.length < 8) return "Hasło musi mieć min. 8 znaków";
    if (!/[A-Z]/.test(password)) return "Hasło musi zawierać wielką literę";
    if (!/[a-z]/.test(password)) return "Hasło musi zawierać małą literę";
    if (!/[0-9]/.test(password)) return "Hasło musi zawierać cyfrę";
    return null;
  };

  // Walidacja telefonu
  const validatePhone = (phone: string) => {
    const re = /^[0-9]{9}$/;
    return re.test(phone.replace(/\s/g, ''));
  };

  const handleRegister = async () => {
    const { firstName, lastName, email, phone, password, confirmPassword } = form;

    // Walidacje
    if (!firstName.trim()) {
      Alert.alert("Błąd", "Podaj imię");
      return;
    }
    if (!lastName.trim()) {
      Alert.alert("Błąd", "Podaj nazwisko");
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert("Błąd", "Nieprawidłowy adres email");
      return;
    }
    if (!validatePhone(phone)) {
      Alert.alert("Błąd", "Numer telefonu musi mieć 9 cyfr");
      return;
    }
    
    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert("Błąd", passwordError);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Błąd", "Hasła nie są identyczne");
      return;
    }

    setLoading(true);
    try {
      // Generuj username z imienia i nazwiska
      const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
      // Data urodzenia (placeholder - możesz dodać pole)
      const dateOfBirth = "1990-01-01";

      const res = await authApi.register({
        email,
        password,
        firstName,
        lastName,
        username,
        dateOfBirth,
        phone
      });
      
      await storage.setToken(res.token);
      await storage.setUser(res.user);
      
      Alert.alert("Sukces", "Konto utworzone!");
      router.replace("/(tabs)" as any);
    } catch (error: any) {
      const msg = error.response?.data?.error || "Błąd rejestracji";
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
        <ScrollView 
          contentContainerStyle={{ padding: 24, gap: 16, backgroundColor: "#fff" }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 8 }}>
            Utwórz konto
          </Text>

          <InputField 
            label="Imię *" 
            value={form.firstName} 
            onChangeText={(v) => setForm({...form, firstName: v})}
            autoCapitalize="words"
          />
          
          <InputField 
            label="Nazwisko *" 
            value={form.lastName} 
            onChangeText={(v) => setForm({...form, lastName: v})}
            autoCapitalize="words"
          />
          
          <InputField 
            label="Email *" 
            value={form.email} 
            onChangeText={(v) => setForm({...form, email: v})}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <InputField 
            label="Telefon * (9 cyfr)" 
            value={form.phone} 
            onChangeText={(v) => setForm({...form, phone: v})}
            keyboardType="phone-pad"
            maxLength={9}
          />
          
          <InputField 
            label="Hasło *" 
            value={form.password} 
            onChangeText={(v) => setForm({...form, password: v})}
            secureTextEntry
            autoCapitalize="none"
          />
          
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: "#666" }}>
              • Min. 8 znaków{"\n"}
              • Wielka i mała litera{"\n"}
              • Min. 1 cyfra
            </Text>
          </View>

          <InputField 
            label="Powtórz hasło *" 
            value={form.confirmPassword} 
            onChangeText={(v) => setForm({...form, confirmPassword: v})}
            secureTextEntry
            autoCapitalize="none"
          />

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
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function InputField({ label, ...props }: any) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "600" }}>{label}</Text>
      <TextInput
        {...props}
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