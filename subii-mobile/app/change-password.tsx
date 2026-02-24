import { useRef, useState, useCallback,useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  UIManager,
  findNodeHandle,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ChangePassword() {
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent as any, (e: any) => {
      const h = e?.endCoordinates?.height ?? 0;
      keyboardHeightRef.current = h;
      setKeyboardHeight(h);
    });
    const hideSub = Keyboard.addListener(hideEvent as any, () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const scrollToInput = useCallback((inputRef: React.RefObject<TextInput>) => {
    const input = inputRef.current;
    if (!input || !scrollRef.current) return;
    const node = findNodeHandle(input);
    if (!node) return;
    UIManager.measureInWindow(node, (_x, y, _w, h) => {
      const screenH = Dimensions.get("window").height;
      const kbH = keyboardHeightRef.current;
      const keyboardTop = kbH > 0 ? screenH - kbH : screenH;
      const inputBottom = y + h;
      const overflow = inputBottom - (keyboardTop - 24);
      if (overflow > 0) {
        scrollRef.current?.scrollTo({ y: scrollYRef.current + overflow, animated: true });
      }
    });
  }, []);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const checks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
  };
  const allChecksPassed = Object.values(checks).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async () => {
    if (!allChecksPassed) {
      Alert.alert("Słabe hasło", "Hasło nie spełnia wymagań bezpieczeństwa.");
      return;
    }
    if (!passwordsMatch) {
      Alert.alert("Błąd", "Hasła nie są identyczne.");
      return;
    }
    setLoading(true);
    try {
      if (!currentPassword.trim()) {
  Alert.alert("Błąd", "Podaj obecne hasło");
  return;
}
await api.post("/api/auth/change-password", { currentPassword, newPassword });
      Alert.alert("Gotowe! 🎉", "Hasło zostało zmienione.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert("Błąd", e.response?.data?.error || "Nie udało się zmienić hasła");
    } finally {
      setLoading(false);
    }
  };

  const Req = ({ met, text }: { met: boolean; text: string }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: met ? "#22c55e" : "#e0e0e0", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{met ? "✓" : ""}</Text>
      </View>
      <Text style={{ fontSize: 13, color: met ? "#22c55e" : "#999" }}>{text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>

          {/* Header */}
          <View style={{ backgroundColor: "#fff", paddingTop: insets.top + 10, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
            <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </Pressable>
            <Text style={{ fontSize: 20, fontWeight: "800" }}>Zmień hasło</Text>
          </View>

          <ScrollView
  ref={scrollRef}
  contentContainerStyle={{ padding: 20, gap: 16 }}
  keyboardShouldPersistTaps="handled"
  onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
  scrollEventThrottle={16}
>

            {/* Nowe hasło */}
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, gap: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#000" }}>Nowe hasło</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, backgroundColor: "#f9f9f9" }}>
                <TextInput
  placeholder="Obecne hasło"
  secureTextEntry
  value={currentPassword}
  onChangeText={setCurrentPassword}
  style={{
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  }}
/>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Wpisz nowe hasło"
                  ref={newPasswordRef}
onFocus={() => { setTimeout(() => scrollToInput(newPasswordRef), 100); }}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  style={{ flex: 1, padding: 14, fontSize: 15 }}
                />
                <Pressable onPress={() => setShowNew(!showNew)} style={{ padding: 14 }}>
                  <Ionicons name={showNew ? "eye-off" : "eye"} size={20} color="#999" />
                </Pressable>
              </View>

              {/* Wymagania */}
              <View style={{ gap: 6, marginTop: 4 }}>
                <Req met={checks.length} text="Min. 8 znaków" />
                <Req met={checks.upper} text="Wielka litera (A-Z)" />
                <Req met={checks.lower} text="Mała litera (a-z)" />
                <Req met={checks.number} text="Cyfra (0-9)" />
                <Req met={checks.special} text="Znak specjalny (!@#$...)" />
              </View>
            </View>

            {/* Powtórz hasło */}
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, gap: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#000" }}>Powtórz hasło</Text>
              <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: confirmPassword.length > 0 ? (passwordsMatch ? "#22c55e" : "#ef4444") : "#e0e0e0", borderRadius: 10, backgroundColor: "#f9f9f9" }}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Powtórz nowe hasło"
                  ref={confirmPasswordRef}
onFocus={() => { setTimeout(() => scrollToInput(confirmPasswordRef), 100); }}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  style={{ flex: 1, padding: 14, fontSize: 15 }}
                />
                <Pressable onPress={() => setShowConfirm(!showConfirm)} style={{ padding: 14 }}>
                  <Ionicons name={showConfirm ? "eye-off" : "eye"} size={20} color="#999" />
                </Pressable>
              </View>
              {confirmPassword.length > 0 && (
                <Text style={{ fontSize: 13, color: passwordsMatch ? "#22c55e" : "#ef4444", fontWeight: "600" }}>
                  {passwordsMatch ? "✓ Hasła są identyczne" : "✕ Hasła nie są identyczne"}
                </Text>
              )}
            </View>

            {/* Przycisk */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={{ backgroundColor: "#000", padding: 16, borderRadius: 14, alignItems: "center", opacity: loading ? 0.6 : 1, marginTop: 8 }}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Potwierdź</Text>}
            </Pressable>

          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}