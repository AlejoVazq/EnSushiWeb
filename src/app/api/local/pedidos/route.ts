import { connection } from 'next/server';

import { getShopDate } from '@/lib/schedule';
import { currentStaff, error, json, ordersByAppEnabled, readJson, requestDate } from '@/server/http';
import { createManualOrder } from '@/server/manualOrders';
import { listStaffOrders } from '@/server/orders';

/**
 * GET /api/local/pedidos[?dia=AAAA-MM-DD]: the shop app's list, today's by default (plus last night's unanswered
 * ones). Development: ?ahora picks what "today" is, like the menu's route.
 */
export async function GET(request: Request) {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  const params = new URL(request.url).searchParams;
  const today = getShopDate(requestDate(params.get('ahora')));
  const day = params.get('dia') ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) return error('El día va como AAAA-MM-DD.', 400);
  return json(await listStaffOrders(day, day === today));
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
