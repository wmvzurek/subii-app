import { Stack } from "expo-router";
import { StripeProvider } from "@stripe/stripe-react-native";
import { AuthProvider } from "../src/contexts/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../src/lib/pushNotifications";
import {
  useFonts,
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_100Thin,
    Inter_200ExtraLight,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  if (!fontsLoaded) return null;

  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
      merchantIdentifier="merchant.com.subii.app"
      urlScheme="subii"
    >
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
              name="forgot-password"
              options={{
                headerShown: false,
                presentation: "card",
                animation: "slide_from_right",
              }}
            />

            <Stack.Screen
              name="reset-password"
              options={{
                headerShown: false,
                presentation: "card",
                animation: "slide_from_right",
              }}
            />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </StripeProvider>
  );
}