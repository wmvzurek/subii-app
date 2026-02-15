import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Błąd weryfikacji</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #c00; }
          </style>
        </head>
        <body>
          <h1 class="error">❌ Błąd weryfikacji</h1>
          <p>Brak tokenu weryfikacyjnego.</p>
        </body>
      </html>
      `,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    const payload = verifyToken(token);
    
    if (!payload || payload.type !== 'verification') {
      throw new Error("Invalid token");
    }

    await prisma.user.update({
      where: { id: payload.userId },
      data: { emailVerified: true },
    });

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Email zweryfikowany</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: #f5f5f5;
            }
            .success { 
              background: #fff;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 500px;
              margin: 0 auto;
            }
            .checkmark { font-size: 64px; color: #22c55e; }
            h1 { color: #000; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="success">
            <div class="checkmark">✓</div>
            <h1>Email zweryfikowany!</h1>
            <p>Twój adres email został pomyślnie potwierdzony.</p>
            <p>Możesz teraz wrócić do aplikacji i korzystać ze wszystkich funkcji.</p>
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
      <html>
        <head>
          <meta charset="utf-8">
          <title>Błąd weryfikacji</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #c00; }
          </style>
        </head>
        <body>
          <h1 class="error">❌ Błąd weryfikacji</h1>
          <p>Link weryfikacyjny jest nieprawidłowy lub wygasł.</p>
          <p>Spróbuj ponownie zarejestrować się lub skontaktuj się z pomocą techniczną.</p>
        </body>
      </html>
      `,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}