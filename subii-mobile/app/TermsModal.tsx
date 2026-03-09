import React from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function TermsModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();

  const BG = "#f5f5f5";
  const WHITE = "#fff";
  const BLACK = "#252729";
  const MUTED = "#666";
  const LIGHT_BORDER = "#eee";

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
            Regulamin i prywatność
          </Text>

          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={BLACK} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 14,
              padding: 20,
              gap: 10,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                color: BLACK,
                fontFamily: FONT_BOLD,
              }}
            >
              Regulamin korzystania z aplikacji
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: MUTED,
                lineHeight: 20,
                fontFamily: FONT_REGULAR,
              }}
            >
              Niniejszy regulamin określa zasady korzystania z aplikacji Subii. Korzystając z aplikacji, akceptujesz poniższe warunki.
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: BLACK,
                marginTop: 8,
                fontFamily: FONT_SEMI,
              }}
            >
              §1 Postanowienia ogólne
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: MUTED,
                lineHeight: 20,
                fontFamily: FONT_REGULAR,
              }}
            >
              Aplikacja Subii służy do zarządzania subskrypcjami streamingowymi oraz śledzenia oglądanych treści. Usługa jest dostępna dla osób pełnoletnich lub za zgodą opiekuna prawnego.
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: BLACK,
                marginTop: 8,
                fontFamily: FONT_SEMI,
              }}
            >
              §2 Konto użytkownika
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: MUTED,
                lineHeight: 20,
                fontFamily: FONT_REGULAR,
              }}
            >
              Użytkownik zobowiązuje się do podania prawdziwych danych przy rejestracji. Hasło jest poufne i nie należy go udostępniać osobom trzecim. Subii nie ponosi odpowiedzialności za szkody wynikłe z nieautoryzowanego dostępu do konta.
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: BLACK,
                marginTop: 8,
                fontFamily: FONT_SEMI,
              }}
            >
              §3 Prawa i obowiązki
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: MUTED,
                lineHeight: 20,
                fontFamily: FONT_REGULAR,
              }}
            >
              Zabrania się wykorzystywania aplikacji do celów niezgodnych z prawem. Subii zastrzega sobie prawo do zawieszenia konta w przypadku naruszenia regulaminu.
            </Text>
          </View>

          <View
            style={{
              backgroundColor: WHITE,
              borderRadius: 14,
              padding: 20,
              gap: 10,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                color: BLACK,
                fontFamily: FONT_BOLD,
              }}
            >
              Polityka prywatności
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: MUTED,
                lineHeight: 20,
                fontFamily: FONT_REGULAR,
              }}
            >
              Dbamy o Twoją prywatność. Poniżej opisujemy, jakie dane zbieramy i w jaki sposób je wykorzystujemy.
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: BLACK,
                marginTop: 8,
                fontFamily: FONT_SEMI,
              }}
            >
              Jakie dane zbieramy?
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: MUTED,
                lineHeight: 20,
                fontFamily: FONT_REGULAR,
              }}
            >
              Zbieramy dane podane przy rejestracji (imię, nazwisko, e-mail, telefon, data urodzenia) oraz dane dotyczące aktywności w aplikacji (oglądane tytuły, subskrypcje).
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: BLACK,
                marginTop: 8,
                fontFamily: FONT_SEMI,
              }}
            >
              Jak wykorzystujemy dane?
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: MUTED,
                lineHeight: 20,
                fontFamily: FONT_REGULAR,
              }}
            >
              Dane służą wyłącznie do świadczenia usług w ramach aplikacji Subii. Nie sprzedajemy danych osobowych podmiotom trzecim.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}