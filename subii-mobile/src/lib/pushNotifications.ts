import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Rejestruje urządzenie do push notyfikacji i wysyła token do backendu.
 * Wywołaj po zalogowaniu użytkownika.
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) {
    // Emulator — push nie działają
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[push] Brak zgody na notyfikacje");
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;
    // Wyślij token do backendu
    await api.post("/api/push-token", { token: pushToken });
    console.log("[push] Token zarejestrowany:", pushToken);
  } catch (err) {
    console.error("[push] Błąd rejestracji tokenu:", err);
  }
}