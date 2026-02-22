import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const FAQ = [
  {
    question: "Jak dodać subskrypcję?",
    answer: "Przejdź na ekran główny i kliknij przycisk '+' w prawym górnym rogu. Wybierz platformę streamingową i plan, a następnie potwierdź dodanie."
  },
  {
    question: "Jak zmienić plan subskrypcji?",
    answer: "Wejdź w szczegóły subskrypcji, kliknij 'Zmień plan' i wybierz nowy plan. Zmiana wejdzie w życie od następnego okresu rozliczeniowego."
  },
  {
    question: "Jak działa weryfikacja e-mail?",
    answer: "Po rejestracji lub zmianie adresu e-mail wysyłamy link weryfikacyjny. Kliknij go w ciągu 24 godzin aby potwierdzić adres."
  },
  {
    question: "Jak śledzić obejrzane filmy i seriale?",
    answer: "Na ekranie szczegółów filmu lub serialu możesz oznaczyć tytuł jako obejrzany lub dodać do ulubionych. Wszystkie oznaczone tytuły znajdziesz w zakładce Profil."
  },
  {
    question: "Jak otrzymać raport miesięczny?",
    answer: "Raport miesięczny jest generowany automatycznie na koniec każdego miesiąca i wysyłany na Twój adres e-mail."
  },
  {
    question: "Nie pamiętam hasła – co zrobić?",
    answer: "Na ekranie logowania kliknij 'Zapomniałem hasła'. Wyślemy Ci link do resetowania hasła na podany adres e-mail."
  },
  {
    question: "Jak usunąć konto?",
    answer: "Aby usunąć konto napisz do nas na adres support@subii.app z prośbą o usunięcie danych. Usuniemy konto w ciągu 7 dni roboczych."
  },
];

export default function Help() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <View style={{ backgroundColor: "#fff", paddingTop: insets.top + 10, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "800" }}>Centrum pomocy</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>

        {/* Kontakt */}
        <View style={{ backgroundColor: "#000", borderRadius: 14, padding: 20, gap: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>Potrzebujesz pomocy?</Text>
          <Text style={{ fontSize: 13, color: "#aaa", lineHeight: 20 }}>
            Napisz do nas – odpowiemy w ciągu 24 godzin.
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff", marginTop: 6 }}>
            📧 support@subii.app
          </Text>
        </View>

        {/* FAQ */}
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#000", marginTop: 8 }}>Często zadawane pytania</Text>

        {FAQ.map((item, index) => (
          <Pressable
            key={index}
            onPress={() => setOpenIndex(openIndex === index ? null : index)}
            style={{ backgroundColor: "#fff", borderRadius: 14, padding: 18, gap: 10 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#000", flex: 1, paddingRight: 12 }}>
                {item.question}
              </Text>
              <Ionicons
                name={openIndex === index ? "chevron-up" : "chevron-down"}
                size={18}
                color="#999"
              />
            </View>
            {openIndex === index && (
              <Text style={{ fontSize: 13, color: "#666", lineHeight: 20 }}>
                {item.answer}
              </Text>
            )}
          </Pressable>
        ))}

        <Text style={{ fontSize: 12, color: "#bbb", textAlign: "center", marginBottom: 20, marginTop: 8 }}>
          Subii v1.0.0
        </Text>

      </ScrollView>
    </View>
  );
}