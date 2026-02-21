import { useState, useEffect } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { storage } from "../../src/lib/storage";
import { useAuth } from "../../src/contexts/AuthContext";
import { api, authApi } from "../../src/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Profile() {
  const router = useRouter();
  const { logout, refreshUser } = useAuth(); // ← DODAJ refreshUser
  const [user, setUser] = useState<any>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      // Odśwież dane w AuthContext
      await refreshUser();
      
      // Pobierz zaktualizowane dane z storage
      const freshUser = await storage.getUser();
      setUser(freshUser);
      
      console.log("👤 User loaded from storage:", freshUser);
    } catch (error) {
      console.error("Error loading user:", error);
      const savedUser = await storage.getUser();
      setUser(savedUser);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUser();
    setRefreshing(false);
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    try {
      await api.post("/api/auth/resend-verification");
      Alert.alert(
        "Email wysłany! 📧",
        "Sprawdź swoją skrzynkę pocztową."
      );
    } catch (error: any) {
      Alert.alert("Błąd", "Nie udało się wysłać emaila");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Wylogować się?",
      "Czy na pewno chcesz się wylogować?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Wyloguj",
          style: "destructive",
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ padding: 20, paddingTop: insets.top+10, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 28, fontWeight: '800' }}>Profil</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000"
            title="Odświeżanie..."
          />
        }
      >
        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12 }}>
          <Text style={{ fontSize: 14, color: '#666' }}>Imię i nazwisko</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 4 }}>
            {user?.firstName} {user?.lastName}
          </Text>
        </View>

        <View style={{ 
          backgroundColor: user?.emailVerified ? '#d4edda' : '#fff3cd', 
          padding: 20, 
          borderRadius: 12,
          borderWidth: 1,
          borderColor: user?.emailVerified ? '#28a745' : '#ffc107'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: '#666' }}>Email</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: '700',
                  color: user?.emailVerified ? '#155724' : '#856404',
                  flex: 1
                }}>
                  {user?.email}
                </Text>
                {user?.emailVerified ? (
                  <Text style={{ fontSize: 20, marginLeft: 8 }}>✅</Text>
                ) : (
                  <Text style={{ fontSize: 20, marginLeft: 8 }}>⚠️</Text>
                )}
              </View>
            </View>
          </View>
          
          {user?.emailVerified ? (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#c3e6cb' }}>
              <Text style={{ fontSize: 12, color: '#155724', fontWeight: '600' }}>
                ✓ Email zweryfikowany
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ffe69c' }}>
              <Text style={{ fontSize: 12, color: '#856404', marginBottom: 8 }}>
                Email nie został zweryfikowany. Sprawdź swoją skrzynkę pocztową.
              </Text>
              <Pressable
                onPress={handleResendVerification}
                disabled={resendingEmail}
                style={{ 
                  padding: 10, 
                  backgroundColor: '#ffc107', 
                  borderRadius: 8,
                  opacity: resendingEmail ? 0.6 : 1
                }}
              >
                {resendingEmail ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={{ color: '#000', textAlign: 'center', fontWeight: '600', fontSize: 12 }}>
                    📧 Wyślij ponownie email weryfikacyjny
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12 }}>
          <Text style={{ fontSize: 14, color: '#666' }}>Telefon</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 4 }}>
            {user?.phone}
          </Text>
        </View>

        <Pressable
          onPress={handleLogout}
          style={{ padding: 16, backgroundColor: '#fee', borderRadius: 10, borderWidth: 1, borderColor: '#fcc', marginTop: 16 }}
        >
          <Text style={{ color: '#c00', textAlign: 'center', fontWeight: '700' }}>
            🚪 Wyloguj się
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}