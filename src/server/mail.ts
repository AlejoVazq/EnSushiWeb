import { BUSINESS } from '@/config/business';

/**
 * Login codes by email, through the SMTP account in `SMTP_URL` (e.g. smtps://usuario:clave@smtp.proveedor.com:465)
 * and `MAIL_FROM`. In development without SMTP the code is printed in the server's console instead.
 */
export const sendLoginCode = async (email: string, code: string): Promise<void> => {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) {
    if (process.env.NODE_ENV === 'production') throw new Error('Falta SMTP_URL');
    console.info(`[dev] Código para ${email}: ${code}`);
    return;
  }

  const { createTransport } = await import('nodemailer');
  const transport = createTransport(smtpUrl);
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? `${BUSINESS.name} <no-responder@localhost>`,
    to: email,
    subject: `${code} es tu código de ${BUSINESS.name}`,
    text: `Tu código para hacer pedidos en ${BUSINESS.name} es ${code}.\n\nVence en 10 minutos. Si no lo pediste, ignorá este correo.`,
  });
};
