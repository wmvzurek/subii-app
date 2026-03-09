import React, { useState } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const FAQ = [
  {question: "Jak dodać nową subskrypcję?",
    answer:
      "Przejdź na ekran główny i kliknij przycisk '+' w prawym górnym rogu. Wybierz platformę streamingową i plan, a następnie potwierdź dodanie.",},
  {question: "Jak zmienić plan subskrypcji?",
    answer:
      "Wejdź w szczegóły subskrypcji, kliknij 'Zmień plan' i wybierz nowy plan. Zmiana wejdzie w życie od następnego okresu rozliczeniowego.",},
  {question: "Jak działa weryfikacja e-mail?",
    answer:
      "Po rejestracji lub zmianie adresu e-mail wysyłamy link weryfikacyjny. Kliknij go w ciągu 24 godzin aby potwierdzić adres.",},
  {question: "Jak śledzić obejrzane filmy i seriale?",
    answer:
      "Na ekranie szczegółów filmu lub serialu możesz oznaczyć tytuł jako obejrzany lub dodać do ulubionych. Wszystkie oznaczone tytuły znajdziesz w zakładce Profil.",},
  {question: "Jak otrzymać raport miesięczny?",
    answer:
      "Raport miesięczny jest generowany automatycznie na koniec każdego miesiąca i wysyłany na Twój adres e-mail.",},
  {question: "Nie pamiętam hasła – co zrobić?",
    answer:
      "Na ekranie logowania kliknij 'Zapomniałem hasła'. Wyślemy Ci link do resetowania hasła na podany adres e-mail.",},
  {question: "Jak usunąć konto?",
    answer:
      "W ustawieniach konta znajdziesz opcję 'Usuń konto'. Operacja jest nieodwracalna i usunie wszystkie Twoje dane.",},
];

export default function HelpModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const BG = "#f5f5f5";
  const WHITE = "#fff";
  const BLACK = "#252729";
  const MUTED = "#666";
  const LIGHT_BORDER = "#eee";
  const LIGHT_MUTED = "#999";

  const FONT_THIN = "Inter_100Thin";
  const FONT_EXTRA_LIGHT = "Inter_200ExtraLight";
  const FONT_LIGHT = "Inter_300Light";
  const FONT_REGULAR = "Inter_400Regular";
  const FONT_MEDIUM = "Inter_500Medium";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";
  const FONT_EXTRA_BOLD = "Inter_800ExtraBold";
  const FONT_BLACK = "Inter_900Black";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: BG }}>
        <View
          style={{
            padding: 20,
            paddingTop: insets.top - 15,
            backgroundColor: WHITE,
            borderBottomWidth: 1,
            borderBottomColor: LIGHT_BORDER,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontSize: 24,
              color: BLACK,
              fontFamily: FONT_SEMI,
            }}
          >
            Centrum pomocy
          </Text>

          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={BLACK} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}>
          {FAQ.map((item, index) => (
            <Pressable
              key={index}
              onPress={() => setOpenIndex(openIndex === index ? null : index)}
              style={{
                backgroundColor: WHITE,
                borderRadius: 14,
                padding: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: BLACK,
                    flex: 1,
                    fontFamily: FONT_SEMI,
                  }}
                >
                  {item.question}
                </Text>

                <Ionicons
                  name={openIndex === index ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={LIGHT_MUTED}
                />
              </View>

              {openIndex === index && (
                <Text
                  style={{
                    fontSize: 13,
                    color: MUTED,
                    lineHeight: 20,
                    marginTop: 10,
                    fontFamily: FONT_REGULAR,
                  }}
                >
                  {item.answer}
                </Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}