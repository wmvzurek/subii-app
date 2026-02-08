import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView } from "react-native";
import { api } from "../../src/lib/api";

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [required, setRequired] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Pobierz saldo
      const balanceRes = await api.get("/api/wallet");
      setBalance(balanceRes.data.balance);

      // Pobierz wymaganą kwotę
      const requiredRes = await api.get("/api/wallet/required?period=month");
      setRequired(requiredRes.data);

      // Auto-ustaw kwotę do doładowania (ile brakuje)
      if (requiredRes.data.missing > 0) {
        setAmount(requiredRes.data.missing.toFixed(2));
      }
    } catch (error) {
      Alert.alert("Błąd", "Nie udało się pobrać danych");
    }
  };

  const topUp = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      Alert.alert("Błąd", "Podaj kwotę > 0");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/wallet", { amount: val });
      setBalance(res.data.newBalance);
      setAmount("");
      Alert.alert("Sukces", `Doładowano ${val.toFixed(2)} zł`);
      loadData(); // Odśwież dane
    } catch {
      Alert.alert("Błąd", "Nie udało się doładować");
    } finally {
      setLoading(false);
    }
  };

  const quickTopUp = () => {
    if (required?.missing > 0) {
      setAmount(required.missing.toFixed(2));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Portfel</Text>
      
      {/* Aktualne saldo */}
      <View style={{ padding: 20, backgroundColor: "#f0f0f0", borderRadius: 12 }}>
        <Text style={{ fontSize: 14, color: "#666" }}>Dostępne środki:</Text>
        <Text style={{ fontSize: 32, fontWeight: "800", marginTop: 4 }}>
          {balance.toFixed(2)} zł
        </Text>
      </View>

      {/* Wymagane środki */}
      {required && (
        <View style={{ 
          padding: 16, 
          backgroundColor: required.missing > 0 ? "#fff3cd" : "#d4edda", 
          borderRadius: 12,
          borderWidth: 1,
          borderColor: required.missing > 0 ? "#ffc107" : "#28a745"
        }}>
          <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 8 }}>
            📊 Podsumowanie subskrypcji
          </Text>
          
          <Text style={{ fontSize: 14, color: "#555" }}>
            Aktywne subskrypcje: {required.breakdown.count}
          </Text>
          
          <Text style={{ fontSize: 14, color: "#555", marginTop: 4 }}>
            Miesięczny koszt: <Text style={{ fontWeight: "700" }}>{required.breakdown.monthlyTotal.toFixed(2)} zł</Text>
          </Text>

          <Text style={{ fontSize: 14, color: "#555", marginTop: 4 }}>
            Roczny koszt: <Text style={{ fontWeight: "700" }}>{required.breakdown.yearlyTotal.toFixed(2)} zł</Text>
          </Text>

          {required.missing > 0 ? (
            <View style={{ marginTop: 12, padding: 12, backgroundColor: "#fff", borderRadius: 8 }}>
              <Text style={{ fontSize: 14, color: "#856404", fontWeight: "600" }}>
                ⚠️ Brakuje Ci {required.missing.toFixed(2)} zł
              </Text>
              <Text style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                Doładuj portfel, aby pokryć wszystkie subskrypcje
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 12, padding: 12, backgroundColor: "#fff", borderRadius: 8 }}>
              <Text style={{ fontSize: 14, color: "#155724", fontWeight: "600" }}>
                ✅ Masz wystarczająco środków
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Lista subskrypcji */}
      {required?.subscriptions && required.subscriptions.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "700" }}>Twoje subskrypcje:</Text>
          {required.subscriptions.map((sub: any, idx: number) => (
            <View 
              key={idx}
              style={{ 
                padding: 12, 
                backgroundColor: "#f8f9fa", 
                borderRadius: 8,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600" }}>{sub.provider}</Text>
                <Text style={{ fontSize: 12, color: "#666" }}>{sub.plan}</Text>
                <Text style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                  Następna płatność: {new Date(sub.nextDueDate).toLocaleDateString("pl-PL")}
                </Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700" }}>
                {sub.price.toFixed(2)} zł
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Doładowanie */}
      <View style={{ marginTop: 16, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Doładuj portfel</Text>
        
        {required?.missing > 0 && (
          <Pressable
            onPress={quickTopUp}
            style={{
              padding: 12,
              backgroundColor: "#ffc107",
              borderRadius: 8,
              alignItems: "center"
            }}
          >
            <Text style={{ fontWeight: "700" }}>
              ⚡ Szybkie doładowanie: {required.missing.toFixed(2)} zł
            </Text>
          </Pressable>
        )}
        
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Kwota (PLN)"
          keyboardType="numeric"
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 10,
            padding: 14,
            fontSize: 16
          }}
        />

        <Pressable
          onPress={topUp}
          disabled={loading}
          style={{
            padding: 16,
            backgroundColor: "#000",
            borderRadius: 10,
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
              💰 Doładuj portfel
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}