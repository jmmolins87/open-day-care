'use server';

import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY no está configurada en .env');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface InvitationEmailData {
  to: string;
  code: string;
  kidFirstName: string;
  roomName: string;
  parentName: string;
}

export async function sendInvitationEmail(data: InvitationEmailData): Promise<{ data: { id: string } | null; error: Error | null }> {
  const resend = getResend();
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev';
  const activationLink = `${appUrl}/activate-account?code=${data.code}`;

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FBF4EC;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <tr>
        <td style="background-color: #FBF4EC; border-radius: 24px; padding: 40px 32px; border: 1px solid #EADFD0;">
          <!-- Logo / Header -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align: center; padding-bottom: 24px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 58px; height: 58px; border-radius: 18px; background: linear-gradient(155deg, #F8C3A8, #F2937A); box-shadow: 0 12px 26px -10px rgba(238, 129, 100, 0.65);">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 18" />
                    <polyline points="6 12 18 12" />
                  </svg>
                </div>
              </td>
            </tr>
          </table>

          <!-- Title -->
          <h1 style="margin: 0 0 8px; font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 600; line-height: 1.2; color: #3F362E; text-align: center;">
            Bienvenida a OpenDayCare
          </h1>

          <!-- Subtitle -->
          <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #8A7A6B; text-align: center;">
            Te invitaron a seguir el día de <strong>${data.kidFirstName}</strong>. Usa el código para activar tu cuenta.
          </p>

          <!-- Invitation card -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border: 1.5px solid #EADFD0; border-radius: 16px; overflow: hidden;">
            <tr>
              <td style="padding: 20px 16px; text-align: center;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 19px; font-weight: 600; background-color: #A9D9E8; color: #1F7A93;">
                  ${data.kidFirstName.charAt(0).toUpperCase()}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 16px; text-align: center;">
                <p style="margin: 0 0 4px; font-size: 13px; color: #8A7A6B;">Te invitaron a seguir a</p>
                <p style="margin: 0; font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 17px; font-weight: 600; color: #3F362E;">${data.kidFirstName} · Sala ${data.roomName}</p>
              </td>
            </tr>
          </table>

          <!-- Code card -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px; border: 1.5px dashed #E6D08A; background-color: #FBF1D6; border-radius: 16px; overflow: hidden;">
            <tr>
              <td style="padding: 18px; text-align: center;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.7px; color: #A88526;">
                  CÓDIGO DE INVITACIÓN
                </p>
                <p style="margin: 0; font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 34px; font-weight: 600; letter-spacing: 7px; color: #8A7234;">
                  ${data.code}
                </p>
                <p style="margin: 8px 0 0; font-size: 13px; color: #A88526;">Vence en 7 días</p>
              </td>
            </tr>
          </table>

          <!-- CTA Button -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px;">
            <tr>
              <td style="text-align: center;">
                <a href="${activationLink}" style="display: inline-block; width: 100%; max-width: 280px; padding: 15px 0; border-radius: 15px; background: linear-gradient(to bottom, #F8C3A8, #F2937A); color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; font-weight: 700; text-decoration: none; text-align: center; box-shadow: 0 10px 22px -8px rgba(238, 129, 100, 0.7);">
                  Activar mi cuenta
                </a>
              </td>
            </tr>
          </table>

          <!-- Fallback link -->
          <p style="margin: 24px 0 0; text-align: center; font-size: 13px; color: #8A7A6B;">
            ¿El botón no funciona? Copia este enlace en tu navegador:<br />
            <a href="${activationLink}" style="color: #F2937A; word-break: break-all;">${activationLink}</a>
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding-top: 24px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #B6A99B;">
            OpenDayCare — Guardería Sala Soles
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  try {
    const result = await resend.emails.send({
      from,
      to: [data.to],
      subject: `Invitación a OpenDayCare — vincula tu cuenta con ${data.kidFirstName}`,
      html,
    });
    return { data: result.data, error: result.error ? new Error(result.error.message) : null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}