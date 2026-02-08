import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { storage } from "../src/lib/storage";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const savedUser = await storage.getUser();
    setUser(savedUser);
    setLoading(false);

    if (!savedUser) {
      router.replace("/login" as any);
    }
  };

  const handleLogout = async () => {
    await storage.clearAuth();
    router.replace("/login" as any);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 8 }}>
        Witaj, {user?.firstName || "User"}! 👋
      </Text>

      <Pressable 
        style={styles.button}
        onPress={() => router.push("/subscriptions-manage" as any)}
      >
        <Text>📋 Moje subskrypcje</Text>
      </Pressable>

      <Pressable 
        style={styles.button}
        onPress={() => router.push("/payments" as any)}
      >
        <Text>💳 Płatności</Text>
      </Pressable>

      <Pressable 
        style={styles.button}
        onPress={() => router.push("/report" as any)}
      >
        <Text>📊 Raport miesięczny</Text>
      </Pressable>

      <Pressable 
        style={styles.button}
        onPress={() => router.push("/search" as any)}
      >
        <Text>🔍 Szukaj filmów/seriali</Text>
      </Pressable>

      <Pressable 
        onPress={handleLogout} 
        style={[styles.button, { backgroundColor: "#fee" }]}
      >
        <Text style={{ color: "#c00" }}>🚪 Wyloguj się</Text>
      </Pressable>
    </View>
  );
}

const styles = {
  button: {
    padding: 14,
    backgroundColor: "#eee",
    borderRadius: 10
  }
};