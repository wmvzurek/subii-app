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
import {
  useFonts,
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";

type Errors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  password?: string;
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9]{9}$/;
const DOB_RE = /^(\d{2})-(\d{2})-(\d{4})$/;
const SPECIAL_RE = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

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
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate()))
    return age - 1;
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
  if (
    d.getFullYear() !== yyyy ||
    d.getMonth() !== mm - 1 ||
    d.getDate() !== dd
  )
    return null;

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
  else if (!validatePhone(form.phone))
    newErrors.phone = "Numer telefonu musi mieć 9 cyfr";

  if (!dobText.trim()) newErrors.dateOfBirth = "Podaj datę urodzenia";
  else {
    const parsed = parseDateDMY(dobText);
    if (!parsed) newErrors.dateOfBirth = "Wpisz datę w formacie DD-MM-YYYY";
    else if (validateAge(parsed) < 13)
      newErrors.dateOfBirth = "Musisz mieć minimum 13 lat";
  }

  const pe = validatePassword(form.password);
  if (pe) newErrors.password = pe;

  if (form.password !== form.confirmPassword)
    newErrors.confirmPassword = "Hasła nie są identyczne";

  return newErrors;
}

export default function Register() {
  const router = useRouter();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    Inter_100Thin,
    Inter_200ExtraLight,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  const BG = "#fff";
  const WHITE = "#fff";
  const BLACK = "#252729";
  const MUTED = "#666";
  const BORDER = "#ddd";
  const INPUT_BG = "#f9f9f9";
  const ERROR = "#e44343";
  const PLACEHOLDER = "#9a9a9a";
  const PLACEHOLDER_2 = "#9ca3af";
  const DIVIDER = "#e6e6e6";
  const CARD_BORDER = "#eee";
  const SUCCESS = "#47c073";

  const FONT_LIGHT = "Inter_300Light";
  const FONT_REG = "Inter_400Regular";
  const FONT_MED = "Inter_500Medium";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";

  const [layoutH, setLayoutH] = useState(0);
  const [contentH, setContentH] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const dobRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const scrollYRef = useRef(0);
  const isClampingRef = useRef(false);
  const pendingFocusRef = useRef<React.RefObject<TextInput> | null>(null);
  const pendingGapRef = useRef(24);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardHeightRef = useRef(0);

  const baseBottomPadding = 12 + insets.bottom;
  const keyboardPadding = keyboardHeight > 0 ? keyboardHeight + 24 : 0;
  const effectiveBottomPadding = baseBottomPadding + keyboardPadding;

  const maxScrollY = Math.max(0, contentH - layoutH);

  const scrollToInputStable = useCallback(
    (ref: React.RefObject<TextInput>, gap = 24) => {
      const input = ref.current;
      const scroller = scrollRef.current;
      if (!input || !scroller) return;

      const node = findNodeHandle(input);
      if (!node) return;

      UIManager.measureInWindow(node, (_x, y, _w, h) => {
        const screenH = Dimensions.get("window").height;
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
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent as any, (e: any) => {
      const h = e?.endCoordinates?.height ?? 0;
      keyboardHeightRef.current = h;
      setKeyboardHeight(h);

      if (pendingFocusRef.current) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToInputStable(
              pendingFocusRef.current!,
              pendingGapRef.current
            );
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
        "Konto utworzone!",
        "Na podany adres email wysłano wiadomość z linkiem weryfikacyjnym. Sprawdź swoją skrzynkę.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)" as any) }]
      );
    } catch (error: any) {
      const msg = error.response?.data?.error || "Błąd rejestracji";
      Alert.alert("Błąd", msg);
    } finally {
      setLoading(false);
    }
  }, [dobText, form, login, router]);

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
          paddingHorizontal: 24,
          paddingTop: insets.top + 16,
          paddingBottom: effectiveBottomPadding,
          gap: 14,
          backgroundColor: BG,
          flexGrow: 1,
        }}
        onLayout={(e) => setLayoutH(e.nativeEvent.layout.height)}
        onContentSizeChange={(_w, h) => setContentH(h)}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollYRef.current = y;

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
        <View
          style={{
            marginBottom: 10,
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
            <Text style={{ fontSize: 26, color: BLACK, fontFamily: FONT_LIGHT }}>
              ←
            </Text>
          </Pressable>

          <Text
            style={{
              fontSize: 25,
              color: BLACK,
              marginBottom: 8,
              fontFamily: FONT_LIGHT,
            }}
          >
            Utwórz konto Subii
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: MUTED,
              textAlign: "center",
              fontFamily: FONT_LIGHT,
            }}
          >
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
          colors={{ BLACK, MUTED, BORDER, INPUT_BG, ERROR, PLACEHOLDER }}
          fonts={{ FONT_LIGHT, FONT_REG, FONT_MED, FONT_SEMI, FONT_BOLD }}
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
          colors={{ BLACK, MUTED, BORDER, INPUT_BG, ERROR, PLACEHOLDER }}
          fonts={{ FONT_LIGHT, FONT_REG, FONT_MED, FONT_SEMI, FONT_BOLD }}
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
          colors={{ BLACK, MUTED, BORDER, INPUT_BG, ERROR, PLACEHOLDER }}
          fonts={{ FONT_LIGHT, FONT_REG, FONT_MED, FONT_SEMI, FONT_BOLD }}
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
          colors={{ BLACK, MUTED, BORDER, INPUT_BG, ERROR, PLACEHOLDER }}
          fonts={{ FONT_LIGHT, FONT_REG, FONT_MED, FONT_SEMI, FONT_BOLD }}
        />

        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, color: MUTED, fontFamily: FONT_MED }}>
            Data urodzenia *
          </Text>

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
              borderColor:
                touched.dateOfBirth && errors.dateOfBirth ? ERROR : BORDER,
              borderRadius: 10,
              backgroundColor: INPUT_BG,
              paddingHorizontal: 12,
              height: 52,
            }}
          >
            <TextInput
              ref={dobRef}
              value={dobText}
              onChangeText={setDobText}
              onFocus={() => setPendingAndScroll(dobRef, 24)}
              onBlur={() => touchAndValidate("dateOfBirth")}
              placeholder="DD-MM-YYYY"
              placeholderTextColor={PLACEHOLDER_2}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={{
                flex: 1,
                fontSize: 14,
                paddingVertical: 0,
                color: dobText ? BLACK : PLACEHOLDER_2,
                fontFamily: FONT_LIGHT,
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
              <Ionicons
                name="calendar-outline"
                size={22}
                color={PLACEHOLDER_2}
              />
            </Pressable>
          </View>

          {touched.dateOfBirth && errors.dateOfBirth ? (
            <Text style={{ color: ERROR, fontSize: 12, fontFamily: FONT_REG }}>
              {errors.dateOfBirth}
            </Text>
          ) : null}
        </View>

        <View style={{ position: "relative" }}>
          <InputField
            ref={passwordRef}
            label="Hasło *"
            value={form.password}
            onChangeText={(v: string) =>
              setForm((p) => ({ ...p, password: v }))
            }
            onFocus={() => setPendingAndScroll(passwordRef, 24)}
            onBlur={() => touchAndValidate("password")}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            placeholder="••••••••"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            error={undefined}
            colors={{ BLACK, MUTED, BORDER, INPUT_BG, ERROR, PLACEHOLDER }}
            fonts={{ FONT_LIGHT, FONT_REG, FONT_MED, FONT_SEMI, FONT_BOLD }}
            style={{ paddingRight: 44 }}
          />

          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={10}
            style={{
              position: "absolute",
              right: 14,
              top: 0,
              bottom: 0,
              paddingTop: 19,
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={PLACEHOLDER}
            />
          </Pressable>
        </View>

        <View
          style={{
            backgroundColor: INPUT_BG,
            padding: 12,
            borderRadius: 10,
            marginTop: -6,
            borderWidth: 1,
            borderColor: CARD_BORDER,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              marginBottom: 8,
              color: BLACK,
              fontFamily: FONT_SEMI,
            }}
          >
            Hasło musi zawierać:
          </Text>

          <PasswordRequirement
            met={passwordChecks.hasMinLength}
            text="Min. 8 znaków"
            showFail={showPasswordFails && !passwordChecks.hasMinLength}
            muted={MUTED}
            error={ERROR}
            success={SUCCESS}
            fontReg={FONT_REG}
            fontSemi={FONT_SEMI}
          />
          <PasswordRequirement
            met={passwordChecks.hasUpperCase}
            text="Wielką literę (A-Z)"
            showFail={showPasswordFails && !passwordChecks.hasUpperCase}
            muted={MUTED}
            error={ERROR}
            success={SUCCESS}
            fontReg={FONT_REG}
            fontSemi={FONT_SEMI}
          />
          <PasswordRequirement
            met={passwordChecks.hasLowerCase}
            text="Małą literę (a-z)"
            showFail={showPasswordFails && !passwordChecks.hasLowerCase}
            muted={MUTED}
            error={ERROR}
            success={SUCCESS}
            fontReg={FONT_REG}
            fontSemi={FONT_SEMI}
          />
          <PasswordRequirement
            met={passwordChecks.hasNumber}
            text="Min. 1 cyfrę (0-9)"
            showFail={showPasswordFails && !passwordChecks.hasNumber}
            muted={MUTED}
            error={ERROR}
            success={SUCCESS}
            fontReg={FONT_REG}
            fontSemi={FONT_SEMI}
          />
          <PasswordRequirement
            met={passwordChecks.hasSpecialChar}
            text="Znak specjalny (!@#$%^&*...)"
            showFail={showPasswordFails && !passwordChecks.hasSpecialChar}
            muted={MUTED}
            error={ERROR}
            success={SUCCESS}
            fontReg={FONT_REG}
            fontSemi={FONT_SEMI}
          />
        </View>

        <View style={{ position: "relative" }}>
          <InputField
            ref={confirmPasswordRef}
            label="Powtórz hasło *"
            value={form.confirmPassword}
            onChangeText={(v: string) =>
              setForm((p) => ({ ...p, confirmPassword: v }))
            }
            onFocus={() => setPendingAndScroll(confirmPasswordRef, 24)}
            onBlur={() => touchAndValidate("confirmPassword")}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            placeholder="••••••••"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            error={
              touched.confirmPassword ? errors.confirmPassword : undefined
            }
            colors={{ BLACK, MUTED, BORDER, INPUT_BG, ERROR, PLACEHOLDER }}
            fonts={{ FONT_LIGHT, FONT_REG, FONT_MED, FONT_SEMI, FONT_BOLD }}
            style={{ paddingRight: 44 }}
          />

          <Pressable
            onPress={() => setShowConfirmPassword((v) => !v)}
            hitSlop={10}
            style={{
              position: "absolute",
              right: 14,
              top: 0,
              bottom: 0,
              paddingTop: 19,
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={PLACEHOLDER}
            />
          </Pressable>
        </View>

        <Pressable
          onPress={handleRegister}
          disabled={loading}
          style={{
            backgroundColor: BLACK,
            paddingVertical: 16,
            borderRadius: 12,
            marginTop: 6,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <Text
              style={{
                color: WHITE,
                textAlign: "center",
                fontFamily: FONT_BOLD,
                fontSize: 15,
              }}
            >
              Zarejestruj się
            </Text>
          )}
        </Pressable>

        <View
          style={{
            marginTop: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: DIVIDER }} />
          <Text
            style={{
              color: PLACEHOLDER,
              fontSize: 12,
              fontFamily: FONT_LIGHT,
            }}
          >
            lub
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: DIVIDER }} />
        </View>

        <Pressable
          onPress={() => router.back()}
          style={{
            alignItems: "center",
            marginTop: 14,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 13, color: MUTED, fontFamily: FONT_LIGHT }}>
            Masz już konto?{" "}
            <Text style={{ color: BLACK, fontFamily: FONT_SEMI }}>
              Zaloguj się
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

function PasswordRequirement({
  met,
  text,
  showFail,
  muted,
  error,
  success,
  fontReg,
  fontSemi,
}: {
  met: boolean;
  text: string;
  showFail: boolean;
  muted: string;
  error: string;
  success: string;
  fontReg: string;
  fontSemi: string;
}) {
  const icon = met ? "✓" : showFail ? "✕" : "•";
  const color = met ? success : showFail ? error : muted;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
      <Text
        style={{ fontSize: 14, marginRight: 8, color, fontFamily: fontReg }}
      >
        {icon}
      </Text>
      <Text
        style={{ fontSize: 12, color, fontFamily: met ? fontSemi : fontReg }}
      >
        {text}
      </Text>
    </View>
  );
}

const InputField = forwardRef<TextInput, any>(
  ({ label, error, colors, fonts, style, ...props }, ref) => {
    const BLACK = colors?.BLACK ?? "#252729";
    const MUTED = colors?.MUTED ?? "#666";
    const BORDER = colors?.BORDER ?? "#ddd";
    const INPUT_BG = colors?.INPUT_BG ?? "#f9f9f9";
    const ERROR = colors?.ERROR ?? "#ff4444";
    const PLACEHOLDER = colors?.PLACEHOLDER ?? "#9a9a9a";

    const FONT_LIGHT = fonts?.FONT_LIGHT ?? "Inter_300Light";
    const FONT_REG = fonts?.FONT_REG ?? "Inter_400Regular";
    const FONT_MED = fonts?.FONT_MED ?? "Inter_500Medium";

    return (
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 13, color: MUTED, fontFamily: FONT_MED }}>
          {label}
        </Text>

        <TextInput
          ref={ref}
          {...props}
          placeholderTextColor={PLACEHOLDER}
          style={[
            {
              borderWidth: 1,
              borderColor: error ? ERROR : BORDER,
              borderRadius: 10,
              paddingVertical: 14,
              paddingHorizontal: 14,
              fontSize: 14,
              backgroundColor: INPUT_BG,
              color: BLACK,
              fontFamily: FONT_LIGHT,
            },
            style,
          ]}
        />

        {error ? (
          <Text style={{ color: ERROR, fontSize: 12, fontFamily: FONT_REG }}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);
InputField.displayName = "InputField";