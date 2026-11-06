import { connection } from 'next/server';

import { currentStaff, error, json, ordersByAppEnabled, readJson, requestDate } from '@/server/http';
import { createManualOrder } from '@/server/manualOrders';
import { listStaffOrders } from '@/server/orders';

/** GET /api/local/pedidos: the shop app's list (last 18 hours) */
export async function GET(request: Request) {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  return json(await listStaffOrders());
}

/** POST /api/local/pedidos: an order loaded by hand (a customer who ordered by WhatsApp) */
export async function POST(request: Request) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  const body = await readJson(request);
  const ahora = typeof body === 'object' && body !== null && 'ahora' in body ? body.ahora : null;
  const result = await createManualOrder(body, requestDate(ahora));
  return result.ok ? json(result.order, 201) : error(result.error, result.status);
}
