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
import DateTimePicker from '@react-native-community/datetimepicker';
import { authApi } from "../src/lib/api";
import { useAuth } from "../src/contexts/AuthContext";

export default function Register() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: new Date(2000, 0, 1), // Domyślna data
    password: "",
    confirmPassword: ""
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string) => {
  if (password.length < 8) return "Hasło musi mieć min. 8 znaków";
  if (!/[A-Z]/.test(password)) return "Hasło musi zawierać wielką literę";
  if (!/[a-z]/.test(password)) return "Hasło musi zawierać małą literę";
  if (!/[0-9]/.test(password)) return "Hasło musi zawierać cyfrę";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return "Hasło musi zawierać znak specjalny";
  return null;
};

  const validatePhone = (phone: string) => {
    if (!phone) return false;
    const re = /^[0-9]{9}$/;
    return re.test(phone.replace(/\s/g, ''));
  };

  const validateAge = (date: Date) => {
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      return age - 1;
    }
    return age;
  };

  const hasMinLength = form.password.length >= 8;
const hasUpperCase = /[A-Z]/.test(form.password);
const hasLowerCase = /[a-z]/.test(form.password);
const hasNumber = /[0-9]/.test(form.password);
const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password); // ← DODAJ TO

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setForm({...form, dateOfBirth: selectedDate});
    }
  };

  const handleRegister = async () => {
    const { firstName, lastName, email, phone, dateOfBirth, password, confirmPassword } = form;

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
    if (!phone) {
      Alert.alert("Błąd", "Numer telefonu jest obowiązkowy");
      return;
    }
    if (!validatePhone(phone)) {
      Alert.alert("Błąd", "Numer telefonu musi mieć 9 cyfr");
      return;
    }

    const age = validateAge(dateOfBirth);
    if (age < 13) {
      Alert.alert("Błąd", "Musisz mieć minimum 13 lat, aby się zarejestrować");
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
    const res = await authApi.register({
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth: dateOfBirth.toISOString().split('T')[0]
    });
      
      await login(res.token, res.user);
      
      Alert.alert(
      "Konto utworzone! 📧", 
      "Na podany adres email wysłaliśmy wiadomość z linkiem weryfikacyjnym. Sprawdź swoją skrzynkę.",
      [
        {
          text: "OK",
          onPress: () => {} // Użytkownik zostanie automatycznie przekierowany przez AuthContext
        }
      ]
    );
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
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={{ 
            padding: 24, 
            paddingTop: 60,
            gap: 16, 
            backgroundColor: "#fff" 
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Przycisk cofnij */}
          <Pressable 
            onPress={() => router.back()}
            style={{ 
              alignSelf: 'flex-start',
              padding: 8,
              marginBottom: 8
            }}
          >
            <Text style={{ fontSize: 24 }}>←</Text>
          </Pressable>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 32, fontWeight: "900", marginBottom: 4 }}>
              Utwórz konto
            </Text>
            <Text style={{ fontSize: 16, color: "#666" }}>
              Zacznij zarządzać swoimi subskrypcjami
            </Text>
          </View>

          <InputField 
            label="Imię *" 
            value={form.firstName} 
            onChangeText={(v) => setForm({...form, firstName: v})}
            autoCapitalize="words"
            placeholder="Jan"
          />
          
          <InputField 
            label="Nazwisko *" 
            value={form.lastName} 
            onChangeText={(v) => setForm({...form, lastName: v})}
            autoCapitalize="words"
            placeholder="Kowalski"
          />
          
          <InputField 
            label="Email *" 
            value={form.email} 
            onChangeText={(v) => setForm({...form, email: v})}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="jan@example.com"
          />
          
          <InputField 
            label="Telefon *" 
            value={form.phone} 
            onChangeText={(v) => setForm({...form, phone: v})}
            keyboardType="phone-pad"
            maxLength={9}
            placeholder="123456789"
          />

          {/* Data urodzenia */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontWeight: "600", fontSize: 14 }}>Data urodzenia *</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 12,
                padding: 16,
                backgroundColor: "#f9f9f9"
              }}
            >
              <Text style={{ fontSize: 16, color: "#000" }}>
                {form.dateOfBirth.toLocaleDateString('pl-PL', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </Text>
            </Pressable>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={form.dateOfBirth}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()} // Nie można wybrać przyszłej daty
              minimumDate={new Date(1900, 0, 1)} // Minimalna data
            />
          )}
          
          <InputField 
            label="Hasło *" 
            value={form.password} 
            onChangeText={(v) => setForm({...form, password: v})}
            secureTextEntry
            autoCapitalize="none"
            placeholder="••••••••"
          />
          
          {/* Wymagania hasła z dynamicznym podświetlaniem */}
          <View style={{ 
            backgroundColor: "#f9f9f9", 
            padding: 12, 
            borderRadius: 8,
            marginTop: -8
          }}>
            <Text style={{ fontSize: 12, fontWeight: "600", marginBottom: 8, color: "#333" }}>
              Hasło musi zawierać:
            </Text>
            
            <PasswordRequirement 
              met={hasMinLength} 
              text="Min. 8 znaków" 
            />
            <PasswordRequirement 
              met={hasUpperCase} 
              text="Wielką literę (A-Z)" 
            />
            <PasswordRequirement 
              met={hasLowerCase} 
              text="Małą literę (a-z)" 
            />
            <PasswordRequirement 
              met={hasNumber} 
              text="Min. 1 cyfrę (0-9)" 
            />
            <PasswordRequirement 
  met={hasSpecialChar} 
  text="Znak specjalny (!@#$%^&*...)" 
/>
          </View>

          <InputField 
            label="Powtórz hasło *" 
            value={form.confirmPassword} 
            onChangeText={(v) => setForm({...form, confirmPassword: v})}
            secureTextEntry
            autoCapitalize="none"
            placeholder="••••••••"
          />

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={{
              backgroundColor: "#000",
              padding: 18,
              borderRadius: 12,
              marginTop: 16,
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

          <View style={{ marginTop: 24, marginBottom: 40, alignItems: "center" }}>
            <Text style={{ color: "#666", marginBottom: 12 }}>
              Masz już konto?
            </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={{ color: "#000", fontWeight: "700", fontSize: 16 }}>
                Zaloguj się
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// Komponent do wyświetlania wymagań
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
      <Text style={{ 
        fontSize: 14, 
        marginRight: 8,
        color: met ? "#22c55e" : "#666"
      }}>
        {met ? "✓" : "•"}
      </Text>
      <Text style={{ 
        fontSize: 12, 
        color: met ? "#22c55e" : "#666",
        fontWeight: met ? "600" : "400"
      }}>
        {text}
      </Text>
    </View>
  );
}

function InputField({ label, error, ...props }: any) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "600", fontSize: 14 }}>{label}</Text>
      <TextInput
        {...props}
        style={{
          borderWidth: 1,
          borderColor: error ? "#ff4444" : "#ddd",
          borderRadius: 12,
          padding: 16,
          fontSize: 16,
          backgroundColor: "#f9f9f9"
        }}
      />
      {error && (
        <Text style={{ color: "#ff4444", fontSize: 12 }}>
          {error}
        </Text>
      )}
    </View>
  );
}