import { connection } from 'next/server';

import { currentStaff, error, json, ordersByAppEnabled, readJson } from '@/server/http';
import { checkSalesPin, isSalesPinSet } from '@/server/salesPin';

/** GET /api/local/ventas/pin: whether Ventas asks for a PIN ({ required }) */
export async function GET(request: Request) {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  return json({ required: await isSalesPinSet() });
}

/** POST /api/local/ventas/pin { pin }: checks the PIN before showing Ventas */
export async function POST(request: Request) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  const staffId = await currentStaff(request);
  if (!staffId) return error('Sesión vencida.', 401);
  const body = await readJson(request);
  const pin = typeof body === 'object' && body !== null && 'pin' in body ? body.pin : null;
  const result = await checkSalesPin(staffId, pin);
  return result.ok ? json({ ok: true }) : error(result.error, result.status);
}
