import { Resend } from 'resend';

let resend: Resend | null = null;

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ RESEND_API_KEY no está configurado. Los emails se simularán en consola.');
  }
}

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams) {
  try {
    if (!resend) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Email simulado (no hay RESEND_API_KEY):', { to, subject });
      }
      return { success: true, simulated: true };
    }

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@gruposiete.es',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('❌ Error al enviar email:', error);
      return { success: false, error };
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Email enviado correctamente:', data);
    }
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    return { success: false, error };
  }
}

// Plantilla de email
export function getNewSpotsAvailableEmail(userName: string, date: string, spots: string[]) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #343f48; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { background-color: #fdc373; color: #343f48; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Nuevas Plazas Disponibles!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${userName}</strong>,</p>
            <p>Te informamos que hay nuevas plazas disponibles para el <strong>${date}</strong>:</p>
            <ul>
              ${spots.map((spot) => `<li>Plaza ${spot}</li>`).join('')}
            </ul>
            <p>¡Reserva ahora antes de que se agoten!</p>
            <a href="${process.env.NEXTAUTH_URL}" class="button">Ir a la aplicación</a>
          </div>
          <div class="footer">
            <p>Gruposiete - Sistema de Gestión de Parking</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
