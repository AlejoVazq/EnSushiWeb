import { createLoginCode, isValidEmail, normalizeEmail, RESEND_SECONDS } from '@/server/auth';
import { error, json, ordersByAppEnabled, readJson } from '@/server/http';
import { sendLoginCode } from '@/server/mail';
import { allow, clientIp } from '@/server/rateLimit';

/** POST /api/cuenta/codigo { email }: emails a 6-digit code to log in (the account is created on first login) */
export async function POST(request: Request) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!allow(`codigo:${clientIp(request)}`, 8, 60 * 60 * 1000)) {
    return error('Pediste demasiados códigos. Probá de nuevo en un rato.', 429);
  }

  const body = await readJson(request);
  const raw = typeof body === 'object' && body !== null && 'email' in body ? body.email : null;
  const email = typeof raw === 'string' ? normalizeEmail(raw) : '';
  if (!isValidEmail(email)) return error('Revisá el correo.', 400);

  const code = await createLoginCode(email);
  if (!code) return error(`Ya te mandamos un código. Para pedir otro esperá ${RESEND_SECONDS} segundos.`, 429);
  try {
    await sendLoginCode(email, code);
  } catch (cause) {
    console.error('No se pudo mandar el código', cause);
    return error('No pudimos mandarte el correo. Probá de nuevo en un rato.', 502);
  }
  return json({ ok: true });
}
