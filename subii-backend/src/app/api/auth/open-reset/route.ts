import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>Błąd</title></head>
        <body style="font-family:Arial;text-align:center;padding:50px;">
          <h1>❌ Nieprawidłowy link</h1>
          <p>Link jest nieprawidłowy lub wygasł.</p>
        </body>
      </html>
    `, { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // Próbuj otworzyć aplikację przez deep link
  // W DEV używaj IP swojego komputera z portem Expo
// W PROD używaj subii://
const isDev = process.env.NODE_ENV !== "production";
const deepLink = isDev
  ? `exp://${process.env.EXPO_DEV_HOST}:8081/--/reset-password?token=${token}`
  : `subii://reset-password?token=${token}`;

  return new NextResponse(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Resetowanie hasła — Subii</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px 20px; background: #f5f5f5; }
          .card { background: #fff; border-radius: 16px; padding: 40px; max-width: 400px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .btn { display: inline-block; padding: 16px 32px; background: #000; color: #fff; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; margin-top: 20px; }
          .note { color: #999; font-size: 13px; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1 style="font-size:48px;margin:0">🔑</h1>
          <h2>Resetowanie hasła</h2>
          <p>Kliknij przycisk poniżej aby otworzyć aplikację Subii i ustawić nowe hasło.</p>
          <a href="${deepLink}" class="btn">Otwórz aplikację Subii</a>
          <p class="note">Jeśli przycisk nie działa, upewnij się że masz zainstalowaną aplikację Subii.</p>
          <p class="note">Link wygasa po 24 godzinach.</p>
        </div>
        <script>
          // Automatycznie próbuj otworzyć aplikację po 1 sekundzie
          setTimeout(() => {
            window.location.href = "${deepLink}";
          }, 1000);
        </script>
      </body>
    </html>
  `, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}