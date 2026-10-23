import { cookies } from 'next/headers';

import {
  createSession,
  CUSTOMER_COOKIE,
  CUSTOMER_SESSION_SECONDS,
  isValidEmail,
  normalizeEmail,
  verifyLoginCode,
} from '@/server/auth';
import { error, json, ordersByAppEnabled, readJson } from '@/server/http';
import { allow, clientIp } from '@/server/rateLimit';

/** POST /api/cuenta/verificar { email, code }: logs the phone in with a session cookie */
export async function POST(request: Request) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!allow(`verificar:${clientIp(request)}`, 20, 60 * 60 * 1000)) {
    return error('Demasiados intentos. Probá de nuevo en un rato.', 429);
  }

  const body = await readJson(request);
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const email = typeof record.email === 'string' ? normalizeEmail(record.email) : '';
  const code = typeof record.code === 'string' ? record.code.replace(/\D/g, '') : '';
  if (!isValidEmail(email) || code.length !== 6) return error('Ingresá el código de 6 números.', 400);

  const check = await verifyLoginCode(email, code);
  if (!check.ok) return error(check.error, 400);

  const token = await createSession('customer', check.customerId);
  (await cookies()).set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CUSTOMER_SESSION_SECONDS,
  });
  return json({ email });
}
