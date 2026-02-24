/**
 * Wysyła push notyfikację przez Expo Push API.
 * Dokumentacja: https://docs.expo.dev/push-notifications/sending-notifications/
 */
export async function sendPushNotification({
  pushToken,
  title,
  body,
  data = {},
}: {
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  if (!pushToken.startsWith("ExponentPushToken")) {
    console.warn("[push] Nieprawidłowy token:", pushToken);
    return;
  }

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data,
        sound: "default",
        priority: "high",
      }),
    });

    const result = await res.json();
    if (result.data?.status === "error") {
      console.error("[push] Błąd wysyłania:", result.data.message);
    }
  } catch (err) {
    console.error("[push] Wyjątek:", err);
  }
}