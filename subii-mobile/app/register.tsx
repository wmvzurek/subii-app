import React, { useState, useRef, useEffect, forwardRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  UIManager,
  findNodeHandle,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { authApi } from "../src/lib/api";
import { useAuth } from "../src/contexts/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type Errors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  password?: string; // nadal walidujemy, tylko nie wyświetlamy tego komunikatu pod inputem
  confirmPassword?: string;
};

type Touched = {
  firstName?: boolean;
  lastName?: boolean;
  email?: boolean;
  phone?: boolean;
  dateOfBirth?: boolean;
  password?: boolean;
  confirmPassword?: boolean;
};

/** ---------- REGEXY (poza komponentem) ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9]{9}$/;
const DOB_RE = /^(\d{2})-(\d{2})-(\d{4})$/;
const SPECIAL_RE = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

/** ---------- HELPERY (poza komponentem) ---------- */
function validateEmail(email: string) {
  return EMAIL_RE.test(email);
}

function validatePhone(phone: string) {
  if (!phone) return false;
  return PHONE_RE.test(phone.replace(/\s/g, ""));
}

function validatePassword(password: string) {
  if (password.length < 8) return "Hasło musi mieć min. 8 znaków";
  if (!/[A-Z]/.test(password)) return "Hasło musi zawierać wielką literę";
  if (!/[a-z]/.test(password)) return "Hasło musi zawierać małą literę";
  if (!/[0-9]/.test(password)) return "Hasło musi zawierać cyfrę";
  if (!SPECIAL_RE.test(password)) return "Hasło musi zawierać znak specjalny";
  return null;
}

function validateAge(date: Date) {
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) return age - 1;
  return age;
}

function formatDateDMY(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}

function parseDateDMY(text: string) {
  const cleaned = text.trim();
  const match = cleaned.match(DOB_RE);
  if (!match) return null;

  const dd = Number(match[1]);
  const mm = Number(match[2]);
  const yyyy = Number(match[3]);

  if (yyyy < 1900) return null;
  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;

  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;

  const today = new Date();
  if (d > today) return null;

  return d;
}

function allTouchedTrue(): Touched {
  return {
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    dateOfBirth: true,
    password: true,
    confirmPassword: true,
  };
}

/** Jedno źródło prawdy walidacji */
function getErrors(
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: Date;
    password: string;
    confirmPassword: string;
  },
  dobText: string
): Errors {
  const newErrors: Errors = {};

  if (!form.firstName.trim()) newErrors.firstName = "Podaj imię";
  if (!form.lastName.trim()) newErrors.lastName = "Podaj nazwisko";
  if (!validateEmail(form.email)) newErrors.email = "Nieprawidłowy adres email";

  if (!form.phone) newErrors.phone = "Numer telefonu jest obowiązkowy";
  else if (!validatePhone(form.phone)) newErrors.phone = "Numer telefonu musi mieć 9 cyfr";

  if (!dobText.trim()) newErrors.dateOfBirth = "Podaj datę urodzenia";
  else {
    const parsed = parseDateDMY(dobText);
    if (!parsed) newErrors.dateOfBirth = "Wpisz datę w formacie DD-MM-YYYY (np. 01-01-2000)";
    else if (validateAge(parsed) < 13) newErrors.dateOfBirth = "Musisz mieć minimum 13 lat";
  }

  const pe = validatePassword(form.password);
  if (pe) newErrors.password = pe; // walidacja zostaje (blokuje submit)

  if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Hasła nie są identyczne";

  return newErrors;
}

export default function Register() {
  const router = useRouter();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [layoutH, setLayoutH] = useState(0);
  const [contentH, setContentH] = useState(0);

  // ---------- FORM STATE ----------
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: new Date(2000, 0, 1),
    password: "",
    confirmPassword: "",
  });

  const [dobText, setDobText] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Touched>({});

  // ✅ czy użytkownik próbował już submitować (żeby pokazać czerwone X w warunkach hasła)
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // ---------- REFS ----------
  const scrollRef = useRef<ScrollView>(null);

  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const dobRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const scrollYRef = useRef(0);

  // HARD CLAMP
  const isClampingRef = useRef(false);

  // Pending focus
  const pendingFocusRef = useRef<React.RefObject<TextInput> | null>(null);
  const pendingGapRef = useRef(24);

  // ---------- KEYBOARD HEIGHT ----------
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardHeightRef = useRef(0);

  // “niewidoczny” zapas na dole, kiedy klawiatura jest otwarta
  const baseBottomPadding = 12 + insets.bottom;
  const keyboardPadding = keyboardHeight > 0 ? keyboardHeight + 24 : 0; // +24 = 24px nad klawiaturą
  const effectiveBottomPadding = baseBottomPadding + keyboardPadding;

  // maxScrollY liczymy z aktualnych wysokości (contentH uwzględnia paddingBottom)
  const maxScrollY = Math.max(0, contentH - layoutH);

  // ---------- SCROLL TO INPUT ----------
  const scrollToInputStable = useCallback(
    (ref: React.RefObject<TextInput>, gap = 24) => {
      const input = ref.current;
      const scroller = scrollRef.current;
      if (!input || !scroller) return;

      const node = findNodeHandle(input);
      if (!node) return;

      UIManager.measureInWindow(node, (_x, y, _w, h) => {
        const screenH = Dimensions.get("window").height;

        // bierzemy height z refa (pewny, natychmiastowy)
        const kbH = keyboardHeightRef.current;
        const keyboardTop = kbH > 0 ? screenH - kbH : screenH;

        const inputBottom = y + h;
        const overflow = inputBottom - (keyboardTop - gap);

        if (overflow > 0) {
          const target = scrollYRef.current + overflow;
          const clamped = Math.min(Math.max(0, target), maxScrollY);
          scrollRef.current?.scrollTo({ y: clamped, animated: true });
        }
      });
    },
    [maxScrollY]
  );

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent as any, (e: any) => {
      const h = e?.endCoordinates?.height ?? 0;
      keyboardHeightRef.current = h;
      setKeyboardHeight(h);

      if (pendingFocusRef.current) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToInputStable(pendingFocusRef.current!, pendingGapRef.current);
          }, 30);
        });
      }
    });

    const hideSub = Keyboard.addListener(hideEvent as any, () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
      pendingFocusRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToInputStable]);

  const setPendingAndScroll = useCallback(
    (refObj: React.RefObject<TextInput>, gap = 24) => {
      pendingFocusRef.current = refObj;
      pendingGapRef.current = gap;
      scrollToInputStable(refObj, gap);
    },
    [scrollToInputStable]
  );

  const validateField = useCallback(
    (field: keyof Errors) => {
      const all = getErrors(form, dobText);
      const next = all[field];

      setErrors((prev) => {
        if (prev[field] === next) return prev;
        return { ...prev, [field]: next };
      });
    },
    [form, dobText]
  );

  const touchAndValidate = useCallback(
    (field: keyof Errors) => {
      setTouched((t) => ({ ...t, [field]: true }));
      validateField(field);
    },
    [validateField]
  );

  // ---------- DATE PICKER ----------
  const handleDateChange = useCallback(
    (_event: any, selectedDate?: Date) => {
      setShowDatePicker(Platform.OS === "ios");
      if (selectedDate) {
        setForm((p) => ({ ...p, dateOfBirth: selectedDate }));
        setDobText(formatDateDMY(selectedDate));
        setTouched((t) => ({ ...t, dateOfBirth: true }));
        validateField("dateOfBirth");
      }
    },
    [validateField]
  );

  // ---------- SUBMIT ----------
  const handleRegister = useCallback(async () => {
    setSubmitAttempted(true);
    setTouched(allTouchedTrue());

    const all = getErrors(form, dobText);
    setErrors(all);

    if (Object.values(all).some(Boolean)) return;

    const parsedDob = parseDateDMY(dobText)!;

    setLoading(true);
    try {
      const res = await authApi.register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        dateOfBirth: parsedDob.toISOString().split("T")[0],
      });

      await login(res.token, res.user);

      Alert.alert(
        "Konto utworzone! 📧",
        "Na podany adres email wysłaliśmy wiadomość z linkiem weryfikacyjnym. Sprawdź swoją skrzynkę.",
        [{ text: "OK", onPress: () => {} }]
      );
    } catch (error: any) {
      const msg = error.response?.data?.error || "Błąd rejestracji";
      Alert.alert("Błąd", msg);
    } finally {
      setLoading(false);
    }
  }, [dobText, form, login]);

  // ---------- PASSWORD REQUIREMENTS UI ----------
  const passwordChecks = useMemo(() => {
    const pwd = form.password;
    return {
      hasMinLength: pwd.length >= 8,
      hasUpperCase: /[A-Z]/.test(pwd),
      hasLowerCase: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecialChar: SPECIAL_RE.test(pwd),
    };
  }, [form.password]);

  // pokazujemy czerwone X dopiero jeśli user dotknął hasła albo próbował submit
  const showPasswordFails = submitAttempted || !!touched.password;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="never"
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 24,
          paddingTop: insets.top + 10,
          paddingBottom: effectiveBottomPadding,
          gap: 16,
          backgroundColor: "#fff",
          flexGrow: 1,
        }}
        onLayout={(e) => setLayoutH(e.nativeEvent.layout.height)}
        onContentSizeChange={(_w, h) => setContentH(h)}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollYRef.current = y;

          // HARD CLAMP
          if (isClampingRef.current) return;
          const clamped = Math.min(Math.max(0, y), maxScrollY);

          if (Math.abs(clamped - y) > 0.5) {
            isClampingRef.current = true;
            scrollRef.current?.scrollTo({ y: clamped, animated: false });
            requestAnimationFrame(() => {
              isClampingRef.current = false;
            });
          }
        }}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View
          style={{
            marginBottom: 24,
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              position: "absolute",
              left: -20,
              top: 0,
              height: 38,
              justifyContent: "center",
              paddingHorizontal: 8,
            }}
            hitSlop={10}
          >
            <Text style={{ fontSize: 26 }}>←</Text>
          </Pressable>

          <Text
            style={{
              fontSize: 32,
              fontWeight: "900",
              textAlign: "center",
              lineHeight: 38,
              marginBottom: 4,
            }}
          >
            Utwórz konto
          </Text>

          <Text style={{ fontSize: 16, color: "#666", textAlign: "center" }}>
            Zacznij zarządzać swoimi subskrypcjami
          </Text>
        </View>

        <InputField
          ref={firstNameRef}
          label="Imię *"
          value={form.firstName}
          onChangeText={(v: string) => setForm((p) => ({ ...p, firstName: v }))}
          onFocus={() => setPendingAndScroll(firstNameRef, 24)}
          onBlur={() => touchAndValidate("firstName")}
          autoCapitalize="words"
          placeholder="Jan"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => lastNameRef.current?.focus()}
          error={touched.firstName ? errors.firstName : undefined}
        />

        <InputField
          ref={lastNameRef}
          label="Nazwisko *"
          value={form.lastName}
          onChangeText={(v: string) => setForm((p) => ({ ...p, lastName: v }))}
          onFocus={() => setPendingAndScroll(lastNameRef, 24)}
          onBlur={() => touchAndValidate("lastName")}
          autoCapitalize="words"
          placeholder="Kowalski"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => emailRef.current?.focus()}
          error={touched.lastName ? errors.lastName : undefined}
        />

        <InputField
          ref={emailRef}
          label="Email *"
          value={form.email}
          onChangeText={(v: string) => setForm((p) => ({ ...p, email: v }))}
          onFocus={() => setPendingAndScroll(emailRef, 24)}
          onBlur={() => touchAndValidate("email")}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="jan@example.com"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => phoneRef.current?.focus()}
          error={touched.email ? errors.email : undefined}
        />

        <InputField
          ref={phoneRef}
          label="Telefon *"
          value={form.phone}
          onChangeText={(v: string) => setForm((p) => ({ ...p, phone: v }))}
          onFocus={() => setPendingAndScroll(phoneRef, 24)}
          onBlur={() => touchAndValidate("phone")}
          keyboardType="phone-pad"
          maxLength={9}
          placeholder="123456789"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => dobRef.current?.focus()}
          error={touched.phone ? errors.phone : undefined}
        />

        {/* DOB */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "600", fontSize: 14 }}>Data urodzenia *</Text>

          {showDatePicker && (
            <View style={{ marginBottom: 8 }}>
              <DateTimePicker
                value={form.dateOfBirth}
                mode="date"
                display="spinner"
                locale="pl-PL"
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            </View>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: touched.dateOfBirth && errors.dateOfBirth ? "#ff4444" : "#ddd",
              borderRadius: 12,
              backgroundColor: "#f9f9f9",
              paddingHorizontal: 12,
              height: 56,
            }}
          >
            <TextInput
              ref={dobRef}
              value={dobText}
              onChangeText={setDobText}
              onFocus={() => setPendingAndScroll(dobRef, 24)}
              onBlur={() => touchAndValidate("dateOfBirth")}
              placeholder="DD-MM-YYYY"
              placeholderTextColor="#9ca3af"
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={{
                flex: 1,
                fontSize: 16,
                paddingVertical: 0,
                color: dobText ? "#000" : "#9ca3af",
              }}
              onEndEditing={() => {
                const parsed = parseDateDMY(dobText);
                if (parsed) {
                  setForm((p) => ({ ...p, dateOfBirth: parsed }));
                  setDobText(formatDateDMY(parsed));
                }
              }}
            />

            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                setShowDatePicker((prev) => !prev);
              }}
              style={{ paddingLeft: 10, paddingVertical: 8 }}
              hitSlop={10}
            >
              <Ionicons name="calendar-outline" size={22} color="#9ca3af" />
            </Pressable>
          </View>

          {touched.dateOfBirth && errors.dateOfBirth ? (
            <Text style={{ color: "#ff4444", fontSize: 12 }}>{errors.dateOfBirth}</Text>
          ) : null}
        </View>

        <InputField
          ref={passwordRef}
          label="Hasło *"
          value={form.password}
          onChangeText={(v: string) => setForm((p) => ({ ...p, password: v }))}
          onFocus={() => setPendingAndScroll(passwordRef, 24)}
          onBlur={() => touchAndValidate("password")}
          secureTextEntry
          autoCapitalize="none"
          placeholder="••••••••"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          // ❌ Nie pokazujemy komunikatu pod inputem, bo pokazujemy X/✓ w wymaganiach
          error={undefined}
        />

        <View style={{ backgroundColor: "#f9f9f9", padding: 12, borderRadius: 8, marginTop: -8 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", marginBottom: 8, color: "#333" }}>
            Hasło musi zawierać:
          </Text>

          <PasswordRequirement
            met={passwordChecks.hasMinLength}
            text="Min. 8 znaków"
            showFail={showPasswordFails && !passwordChecks.hasMinLength}
          />
          <PasswordRequirement
            met={passwordChecks.hasUpperCase}
            text="Wielką literę (A-Z)"
            showFail={showPasswordFails && !passwordChecks.hasUpperCase}
          />
          <PasswordRequirement
            met={passwordChecks.hasLowerCase}
            text="Małą literę (a-z)"
            showFail={showPasswordFails && !passwordChecks.hasLowerCase}
          />
          <PasswordRequirement
            met={passwordChecks.hasNumber}
            text="Min. 1 cyfrę (0-9)"
            showFail={showPasswordFails && !passwordChecks.hasNumber}
          />
          <PasswordRequirement
            met={passwordChecks.hasSpecialChar}
            text="Znak specjalny (!@#$%^&*...)"
            showFail={showPasswordFails && !passwordChecks.hasSpecialChar}
          />
        </View>

        <InputField
          ref={confirmPasswordRef}
          label="Powtórz hasło *"
          value={form.confirmPassword}
          onChangeText={(v: string) => setForm((p) => ({ ...p, confirmPassword: v }))}
          onFocus={() => setPendingAndScroll(confirmPasswordRef, 24)}
          onBlur={() => touchAndValidate("confirmPassword")}
          secureTextEntry
          autoCapitalize="none"
          placeholder="••••••••"
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          error={touched.confirmPassword ? errors.confirmPassword : undefined}
        />

        <Pressable
          onPress={handleRegister}
          disabled={loading}
          style={{
            backgroundColor: "#000",
            padding: 18,
            borderRadius: 12,
            marginTop: 16,
            opacity: loading ? 0.6 : 1,
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

        <View style={{ marginTop: 24, marginBottom: 12, alignItems: "center" }}>
          <Text style={{ color: "#666", marginBottom: 12 }}>Masz już konto?</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: "#000", fontWeight: "700", fontSize: 16 }}>Zaloguj się</Text>
          </Pressable>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

// ---------- UI: PasswordRequirement (✓ / ✕ / •) ----------
function PasswordRequirement({
  met,
  text,
  showFail,
}: {
  met: boolean;
  text: string;
  showFail: boolean;
}) {
  const icon = met ? "✓" : showFail ? "✕" : "•";
  const color = met ? "#22c55e" : showFail ? "#ef4444" : "#666";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
      <Text style={{ fontSize: 14, marginRight: 8, color }}>{icon}</Text>
      <Text style={{ fontSize: 12, color, fontWeight: met ? "600" : "400" }}>
        {text}
      </Text>
    </View>
  );
}

// ---------- UI: InputField ----------
const InputField = forwardRef<TextInput, any>(({ label, error, ...props }, ref) => {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "600", fontSize: 14 }}>{label}</Text>
      <TextInput
        ref={ref}
        {...props}
        style={{
          borderWidth: 1,
          borderColor: error ? "#ff4444" : "#ddd",
          borderRadius: 12,
          padding: 16,
          fontSize: 16,
          backgroundColor: "#f9f9f9",
        }}
      />
      {error ? <Text style={{ color: "#ff4444", fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
});
InputField.displayName = "InputField";