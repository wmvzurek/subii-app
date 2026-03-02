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
    rejectUnauthorized: false,
  },
});

function baseEmailHtml(params: {
  title: string;
  heading: string;
  intro: string;
  buttonLabel?: string;
  buttonUrl?: string;
  secondaryText?: string;
  codeUrl?: string;
  footerNote?: string;
}) {
  const {
    title,
    heading,
    intro,
    buttonLabel,
    buttonUrl,
    secondaryText,
    codeUrl,
    footerNote,
  } = params;

  const button = buttonLabel && buttonUrl
    ? `
      <tr>
        <td style="padding: 18px 0 6px 0;">
          <a href="${buttonUrl}"
             style="
               display:inline-block;
               background:#111827;
               color:#ffffff;
               text-decoration:none;
               padding:14px 18px;
               border-radius:12px;
               font-weight:600;
               font-size:14px;
               letter-spacing:0.2px;
             ">
             ${buttonLabel}
          </a>
        </td>
      </tr>
    `
    : "";

  const secondary = secondaryText
    ? `
      <tr>
        <td style="padding: 8px 0 0 0; color:#4b5563; font-size:14px; line-height:1.6;">
          ${secondaryText}
        </td>
      </tr>
    `
    : "";

  const codeBlock = codeUrl
    ? `
      <tr>
        <td style="padding: 14px 0 0 0;">
          <div style="
            background:#f3f4f6;
            border:1px solid #e5e7eb;
            border-radius:12px;
            padding:12px 14px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
            font-size:12px;
            color:#111827;
            word-break:break-all;
          ">
            ${codeUrl}
          </div>
        </td>
      </tr>
    `
    : "";

  const footer = footerNote
    ? footerNote
    : `To automatyczna wiadomość — prosimy na nią nie odpowiadać.`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
      </head>
      <body style="margin:0; padding:0; background:#f6f7fb;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb; padding:24px 0;">
          <tr>
            <td align="center" style="padding: 0 12px;">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; width:100%;">
                <tr>
                  <td style="
                    background:#ffffff;
                    border:1px solid #e5e7eb;
                    border-radius:18px;
                    box-shadow:0 8px 24px rgba(17,24,39,0.08);
                    overflow:hidden;
                  ">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:18px 22px; border-bottom:1px solid #e5e7eb;">
                          <div style="font-family: Arial, sans-serif; font-size:14px; color:#111827; font-weight:700; letter-spacing:0.2px;">
                            Subii
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:22px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="font-family: Arial, sans-serif; color:#111827;">
                                <div style="font-size:18px; font-weight:700; margin:0 0 10px 0;">
                                  ${heading}
                                </div>
                                <div style="font-size:14px; line-height:1.7; color:#374151;">
                                  ${intro}
                                </div>
                              </td>
                            </tr>

                            ${button}
                            ${secondary}
                            ${codeBlock}

                            <tr>
                              <td style="padding-top:16px; color:#6b7280; font-size:12px; line-height:1.6; font-family: Arial, sans-serif;">
                                ${footer}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding: 14px 6px; font-family: Arial, sans-serif; color:#9ca3af; font-size:12px; line-height:1.6;">
                    &copy; 2025 Subii. Wszystkie prawa zastrzeżone.
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string
) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${token}`;

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Subii" <appsubii@gmail.com>',
      to: email,
      subject: "Potwierdź swoje konto w Subii",
      html: baseEmailHtml({
        title: "Potwierdzenie konta — Subii",
        heading: `Cześć ${firstName}!`,
        intro:
          "Dziękujemy za rejestrację w Subii. Aby aktywować konto i korzystać ze wszystkich funkcji, potwierdź swój adres e-mail.",
        buttonLabel: "Potwierdź adres e-mail",
        buttonUrl: verificationUrl,
        secondaryText: "Jeśli przycisk nie działa, skopiuj i wklej link w przeglądarce:",
        codeUrl: verificationUrl,
        footerNote: "Link jest ważny przez 24 godziny.",
      }),
    });

    console.log("[EMAIL] Email wysłany pomyślnie!");
    console.log("[EMAIL] Message ID:", info.messageId);
    return true;
  } catch (error) {
    console.error("[EMAIL] Błąd wysyłania emaila:", error);
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
    d.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Subii" <appsubii@gmail.com>',
      to: email,
      subject: `Subii · Raport miesięczny ${period}`,
      html: baseEmailHtml({
        title: "Raport miesięczny — Subii",
        heading: `Cześć ${firstName}!`,
        intro: `W załączniku znajdziesz swój raport za okres <strong>${formatDate(
          periodFrom
        )}</strong> – <strong>${formatDate(periodTo)}</strong>.`,
        secondaryText:
          "Raport zawiera podsumowanie Twoich subskrypcji oraz aktywności w tym okresie.",
        footerNote: "To automatyczna wiadomość — prosimy na nią nie odpowiadać.",
      }),
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
    console.error("[EMAIL] Błąd wysyłania raportu:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  token: string
) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/open-reset?token=${token}`;
  const webResetUrl = resetUrl;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Subii" <appsubii@gmail.com>',
      to: email,
      subject: "Resetowanie hasła w Subii",
      html: baseEmailHtml({
        title: "Resetowanie hasła — Subii",
        heading: `Cześć ${firstName}!`,
        intro:
          "Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta. Jeśli to Ty, użyj poniższego linku.",
        buttonLabel: "Resetuj hasło",
        buttonUrl: resetUrl,
        secondaryText: "Jeśli przycisk nie działa, skopiuj i wklej link w przeglądarce:",
        codeUrl: webResetUrl,
        footerNote: "Link jest ważny przez 24 godziny. Jeśli to nie Ty — zignoruj tę wiadomość.",
      }),
    });

    return true;
  } catch (error) {
    console.error("[sendPasswordResetEmail]", error);
    return false;
  }
}