import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html lang="pl">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Błąd</title>
          <style>
            body {
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #f5f5f7;
              color: #111;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
            }
            .card {
              background: #ffffff;
              padding: 48px 40px;
              border-radius: 20px;
              max-width: 420px;
              width: 100%;
              text-align: center;
              box-shadow: 0 20px 60px rgba(0,0,0,0.06);
            }
            h1 {
              margin: 0 0 12px;
              font-size: 22px;
              font-weight: 600;
            }
            p {
              color: #6b7280;
              font-size: 14px;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Nieprawidłowy link</h1>
            <p>Link jest nieprawidłowy lub wygasł.</p>
          </div>
        </body>
      </html>
      `,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const isDev = process.env.NODE_ENV !== "production";
  const deepLink = isDev
    ? `exp://${process.env.EXPO_DEV_HOST}:8081/--/reset-password?token=${token}`
    : `subii://reset-password?token=${token}`;

  return new NextResponse(
    `
    <!DOCTYPE html>
    <html lang="pl">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Reset hasła — Subii</title>
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f5f5f7;
            color: #111;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
          }
          .card {
            background: #ffffff;
            border-radius: 24px;
            padding: 56px 40px;
            max-width: 420px;
            width: 100%;
            text-align: center;
            box-shadow: 0 30px 80px rgba(0,0,0,0.06);
          }
          h1 {
            margin: 0 0 14px;
            font-size: 24px;
            font-weight: 600;
            letter-spacing: -0.2px;
          }
          p {
            font-size: 15px;
            color: #6b7280;
            margin-bottom: 32px;
            line-height: 1.6;
          }
          .btn {
            display: inline-block;
            width: 100%;
            padding: 16px;
            border-radius: 16px;
            background: #111;
            color: #ffffff;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
          }
          .note {
            margin-top: 24px;
            font-size: 12px;
            color: #9ca3af;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Resetowanie hasła</h1>
          <p>Otwórz aplikację Subii, aby ustawić nowe hasło do swojego konta.</p>
          <a href="${deepLink}" class="btn">Otwórz aplikację</a>
          <div class="note">
            Jeśli przycisk nie działa, upewnij się, że aplikacja Subii jest zainstalowana.
            <br>
            Link wygasa po 24 godzinach.
          </div>
        </div>
        <script>
          setTimeout(() => {
            window.location.href = "${deepLink}";
          }, 1200);
        </script>
      </body>
    </html>
    `,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}