import { Stack } from "expo-router";
import { AuthProvider } from "../src/contexts/AuthContext";
import { useEffect } from "react";
import { storage } from "../src/lib/storage";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  useEffect(() => {
    if (__DEV__) {
      console.log("🔥 DEV MODE - Clearing auth storage");
      storage.clearAuth().then(() => {
        console.log("✅ Auth cleared - will show login screen");
      });
    }
  }, []);

  return (
    <SafeAreaProvider>
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
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="subscriptions-select-plan"
            options={{
              presentation: "modal",
              headerShown: false,
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="subscriptions-manage"
            options={{
              presentation: "modal",
              headerShown: true,
              title: "Zarządzaj subskrypcjami",
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
          <Stack.Screen
            name="subscription-detail"
            options={{
              presentation: "card",
              headerShown: false,
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
  name="titles/[tmdbId]"
  options={{
    headerShown: false,
    presentation: "card",
    animation: "slide_from_right",
  }}
/>
<Stack.Screen
  name="person/[personId]"
  options={{
    headerShown: false,
    presentation: "card",
    animation: "slide_from_right",
  }}
/>

<Stack.Screen
  name="change-password"
  options={{
    headerShown: false,
    presentation: "card",
    animation: "slide_from_right",
  }}
/>

<Stack.Screen
  name="watched-list"
  options={{
    headerShown: false,
    presentation: "card",
    animation: "slide_from_right",
  }}
/>
<Stack.Screen
  name="terms"
  options={{
    headerShown: false,
    presentation: "card",
    animation: "slide_from_right",
  }}
/>
<Stack.Screen
  name="help"
  options={{
    headerShown: false,
    presentation: "card",
    animation: "slide_from_right",
  }}
/>
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}