import { useState, useEffect } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { storage } from "../../src/lib/storage";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const savedUser = await storage.getUser();
    setUser(savedUser);
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
            await storage.clearAuth();
            router.replace("/login" as any);
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ padding: 20, paddingTop: 60, backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 28, fontWeight: '800' }}>Profil</Text>
      </View>

      <View style={{ padding: 20, gap: 16, marginTop: 20 }}>
        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12 }}>
          <Text style={{ fontSize: 14, color: '#666' }}>Imię i nazwisko</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 4 }}>
            {user?.firstName} {user?.lastName}
          </Text>
        </View>

        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12 }}>
          <Text style={{ fontSize: 14, color: '#666' }}>Email</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 4 }}>
            {user?.email}
          </Text>
        </View>

        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12 }}>
          <Text style={{ fontSize: 14, color: '#666' }}>Nazwa użytkownika</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 4 }}>
            {user?.username}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/subscriptions-manage" as any)}
          style={{ padding: 16, backgroundColor: '#000', borderRadius: 10, marginTop: 16 }}
        >
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>
            📋 Zarządzaj subskrypcjami
          </Text>
        </Pressable>

        <Pressable
          onPress={handleLogout}
          style={{ padding: 16, backgroundColor: '#fee', borderRadius: 10, borderWidth: 1, borderColor: '#fcc' }}
        >
          <Text style={{ color: '#c00', textAlign: 'center', fontWeight: '700' }}>
            🚪 Wyloguj się
          </Text>
        </Pressable>
      </View>
    </View>
  );
}