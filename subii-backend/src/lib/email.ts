import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // ← DODAJ TO (ominięcie weryfikacji certyfikatu)
  }
});

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string
) {
  console.log("📧 [EMAIL] Próba wysłania emaila do:", email);
  console.log("📧 [EMAIL] SMTP Config:", {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    hasPass: !!process.env.SMTP_PASS,
    passLength: process.env.SMTP_PASS?.length
  });
  
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${token}`;

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Subii" <appsubii@gmail.com>',
      to: email,
      subject: "Potwierdź swoje konto w Subii",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 14px 28px; background: #000; color: #fff; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Witaj w Subii!</h1>
            </div>
            <div class="content">
              <h2>Cześć ${firstName}! 👋</h2>
              <p>Dziękujemy za rejestrację w Subii - aplikacji do zarządzania subskrypcjami.</p>
              <p>Aby aktywować swoje konto, kliknij poniższy przycisk:</p>
              <center>
                <a href="${verificationUrl}" class="button">Potwierdź adres email</a>
              </center>
              <p>Lub skopiuj ten link do przeglądarki:</p>
              <p style="background: #fff; padding: 10px; border-radius: 4px; word-break: break-all;">
                ${verificationUrl}
              </p>
              <p><strong>Link będzie ważny przez 24 godziny.</strong></p>
              <p>Dopóki nie potwierdzisz swojego adresu email, nie będziesz mógł:</p>
<ul>
  <li>Dodawać subskrypcji</li>
</ul>
            </div>
            <div class="footer">
              <p>To automatyczna wiadomość - nie odpowiadaj na nią.</p>
              <p>&copy; 2025 Subii. Wszystkie prawa zastrzeżone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    
    console.log("✅ [EMAIL] Email wysłany pomyślnie!");
    console.log("✅ [EMAIL] Message ID:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ [EMAIL] Błąd wysyłania emaila:", error);
    return false;
  }
}

export async function sendReportEmail(
  email: string,
  firstName: string,
  period: string,
  periodFrom: Date,
  periodTo: Date,
  pdfBase64: string
) {
  const formatDate = (d: Date) =>
    d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Subii" <appsubii@gmail.com>',
      to: email,
      subject: `Subii · Raport miesięczny ${period}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #000; color: #fff; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subii · Raport miesięczny</h1>
            </div>
            <div class="content">
              <h2>Cześć ${firstName}! 👋</h2>
              <p>W załączniku znajdziesz swój miesięczny raport za okres:</p>
              <p><strong>${formatDate(periodFrom)} – ${formatDate(periodTo)}</strong></p>
              <p>Raport zawiera podsumowanie Twoich subskrypcji oraz obejrzanych tytułów w tym okresie.</p>
            </div>
            <div class="footer">
              <p>To automatyczna wiadomość - nie odpowiadaj na nią.</p>
              <p>&copy; 2025 Subii. Wszystkie prawa zastrzeżone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `subii-raport-${period}.pdf`,
          content: Buffer.from(pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ],
    });
    return true;
  } catch (error) {
    console.error("❌ [EMAIL] Błąd wysyłania raportu:", error);
    return false;
  }
}