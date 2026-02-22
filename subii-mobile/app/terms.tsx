import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function Terms() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <View style={{ backgroundColor: "#fff", paddingTop: insets.top + 10, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: "800" }}>Regulamin i prywatność</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>

        {/* Regulamin */}
        <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#000" }}>Regulamin korzystania z aplikacji</Text>
          <Text style={{ fontSize: 13, color: "#666", lineHeight: 20 }}>
            Niniejszy regulamin określa zasady korzystania z aplikacji Subii. Korzystając z aplikacji, akceptujesz poniższe warunki.
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#000", marginTop: 8 }}>§1 Postanowienia ogólne</Text>
          <Text style={{ fontSize: 13, color: "#666", lineHeight: 20 }}>
            Aplikacja Subii służy do zarządzania subskrypcjami streamingowymi oraz śledzenia oglądanych treści. Usługa jest dostępna dla osób pełnoletnich lub za zgodą opiekuna prawnego.
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#000", marginTop: 8 }}>§2 Konto użytkownika</Text>
          <Text style={{ fontSize: 13, color: "#666", lineHeight: 20 }}>
            Użytkownik zobowiązuje się do podania prawdziwych danych przy rejestracji. Hasło jest poufne i nie należy go udostępniać osobom trzecim. Subii nie ponosi odpowiedzialności za szkody wynikłe z nieautoryzowanego dostępu do konta.
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#000", marginTop: 8 }}>§3 Prawa i obowiązki</Text>
          <Text style={{ fontSize: 13, color: "#666", lineHeight: 20 }}>
            Zabrania się wykorzystywania aplikacji do celów niezgodnych z prawem. Subii zastrzega sobie prawo do zawieszenia konta w przypadku naruszenia regulaminu.
          </Text>
        </View>

        {/* Polityka prywatności */}
        <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 20, gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#000" }}>Polityka prywatności</Text>
          <Text style={{ fontSize: 13, color: "#666", lineHeight: 20 }}>
            Dbamy o Twoją prywatność. Poniżej opisujemy jakie dane zbieramy i w jaki sposób je wykorzystujemy.
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#000", marginTop: 8 }}>Jakie dane zbieramy?</Text>
          <Text style={{ fontSize: 13, color: "#666", lineHeight: 20 }}>
            Zbieramy dane podane przy rejestracji (imię, nazwisko, e-mail, telefon, data urodzenia) oraz dane dotyczące aktywności w aplikacji (oglądane tytuły, subskrypcje).
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#000", marginTop: 8 }}>Jak wykorzystujemy dane?</Text>
          <Text style={{ fontSize: 13, color: "#666", lineHeight: 20 }}>
            Dane służą wyłącznie do świadczenia usług w ramach aplikacji Subii. Nie sprzedajemy danych osobowych podmiotom trzecim. Dane mogą być wykorzystane do wysyłania powiadomień o subskrypcjach i raportów miesięcznych.
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#000", marginTop: 8 }}>Usunięcie danych</Text>
          <Text style={{ fontSize: 13, color: "#666", lineHeight: 20 }}>
            Możesz poprosić o usunięcie swoich danych w dowolnym momencie pisząc na adres: support@subii.app
          </Text>
        </View>

        <Text style={{ fontSize: 12, color: "#bbb", textAlign: "center", marginBottom: 20 }}>
          Ostatnia aktualizacja: styczeń 2025
        </Text>

      </ScrollView>
    </View>
  );
}