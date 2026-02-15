import { Stack } from "expo-router";
import { AuthProvider } from "../src/contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="subscriptions-add" 
          options={{ 
            presentation: "modal", 
            headerShown: true, 
            title: "Dodaj subskrypcję" 
          }} 
        />
        <Stack.Screen 
          name="subscriptions-manage" 
          options={{ 
            presentation: "modal", 
            headerShown: true, 
            title: "Zarządzaj subskrypcjami" 
          }} 
        />
      </Stack>
    </AuthProvider>
  );
}