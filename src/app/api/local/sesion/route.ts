import { createSession, loginStaff } from '@/server/auth';
import { error, json, ordersByAppEnabled, readJson } from '@/server/http';
import { allow, clientIp } from '@/server/rateLimit';

/** POST /api/local/sesion { username, password }: the shop app logs in and gets a token */
export async function POST(request: Request) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!allow(`local:${clientIp(request)}`, 10, 15 * 60 * 1000)) return error('Demasiados intentos. Esperá unos minutos.', 429);

  const body = await readJson(request);
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const username = typeof record.username === 'string' ? record.username : '';
  const password = typeof record.password === 'string' ? record.password : '';
  const staffId = username && password ? await loginStaff(username, password) : null;
  if (!staffId) return error('Usuario o contraseña incorrectos.', 401);
  return json({ token: await createSession('staff', staffId) });
}
