import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
          <title>Błąd weryfikacji</title>
          <style>
            * { box-sizing: border-box; }
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
              max-width: 460px;
              width: 100%;
              text-align: center;
              box-shadow: 0 30px 80px rgba(0,0,0,0.06);
            }
            .icon {
              width: 48px;
              height: 48px;
              margin: 0 auto 20px;
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
              margin: 0;
              line-height: 1.6;
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
            <div class="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="6" y1="6" x2="18" y2="18"/>
                <line x1="18" y1="6" x2="6" y2="18"/>
              </svg>
            </div>
            <h1>Błąd weryfikacji</h1>
            <p>Brak tokenu weryfikacyjnego.</p>
          </div>
        </body>
      </html>
      `,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    const payload = verifyToken(token);

    if (!payload || payload.type !== "verification") {
      throw new Error("Invalid token");
    }

    await prisma.user.update({
      where: { id: payload.userId },
      data: { emailVerified: true },
    });

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html lang="pl">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Email zweryfikowany</title>
          <style>
            * { box-sizing: border-box; }
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
              max-width: 460px;
              width: 100%;
              text-align: center;
              box-shadow: 0 30px 80px rgba(0,0,0,0.06);
            }
            .icon {
              width: 48px;
              height: 48px;
              margin: 0 auto 20px;
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
              margin: 0;
              line-height: 1.6;
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
            <div class="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1>Email zweryfikowany</h1>
            <p>Twój adres email został pomyślnie potwierdzony.</p>
            <div class="note">
              Możesz teraz wrócić do aplikacji i korzystać ze wszystkich funkcji.
            </div>
          </div>
        </body>
      </html>
      `,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    console.error("[/api/auth/verify] error:", error);

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html lang="pl">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Błąd weryfikacji</title>
          <style>
            * { box-sizing: border-box; }
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
              max-width: 460px;
              width: 100%;
              text-align: center;
              box-shadow: 0 30px 80px rgba(0,0,0,0.06);
            }
            .icon {
              width: 48px;
              height: 48px;
              margin: 0 auto 20px;
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
              margin: 0;
              line-height: 1.6;
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
            <div class="icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="6" y1="6" x2="18" y2="18"/>
                <line x1="18" y1="6" x2="6" y2="18"/>
              </svg>
            </div>
            <h1>Błąd weryfikacji</h1>
            <p>Link weryfikacyjny jest nieprawidłowy lub wygasł.</p>
            <div class="note">
              Spróbuj ponownie zarejestrować się lub skontaktuj się z pomocą techniczną.
            </div>
          </div>
        </body>
      </html>
      `,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}