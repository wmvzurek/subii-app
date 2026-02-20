import { Stack } from "expo-router";
import { AuthProvider } from "../src/contexts/AuthContext";
import { useEffect } from "react";
import { storage } from "../src/lib/storage";

export default function RootLayout() {
  useEffect(() => {
    // TYLKO W DEV MODE - wyczyść storage przy każdym hot reload
    if (__DEV__) {
      console.log("🔥 DEV MODE - Clearing auth storage");
      storage.clearAuth().then(() => {
        console.log("✅ Auth cleared - will show login screen");
      });
    }
  }, []);

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
            headerShown: false,
            animation: 'slide_from_bottom'
          }} 
        />
        <Stack.Screen 
          name="subscriptions-select-plan" 
          options={{ 
            presentation: "modal", 
            headerShown: false,
            animation: 'slide_from_right'
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
        <Stack.Screen
  name="billing-setup"
  options={{
    presentation: "modal",
    headerShown: false,
    animation: "slide_from_bottom",
  }}
/>
      </Stack>
    </AuthProvider>
  );
}