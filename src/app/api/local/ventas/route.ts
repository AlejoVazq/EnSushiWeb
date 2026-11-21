import { connection } from 'next/server';

import { currentStaff, error, json, ordersByAppEnabled, readJson } from '@/server/http';
import { listSales } from '@/server/orders';
import { checkSalesPin, isSalesPinSet } from '@/server/salesPin';

/**
 * GET /api/local/ventas?desde=AAAA-MM-DD&hasta=AAAA-MM-DD: the confirmed orders of those days, for apps from before
 * the PIN. Once a PIN is set, only POST answers.
 */
export async function GET(request: Request) {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  if (await isSalesPinSet()) return error('Ventas pide el PIN: actualizá la app.', 403);
  const params = new URL(request.url).searchParams;
  const result = await listSales(params.get('desde') ?? '', params.get('hasta') ?? '');
  return result.ok ? json(result.orders) : error(result.error, 400);
}

/** POST /api/local/ventas { desde, hasta, pin }: the confirmed orders of those days ("AAAA-MM-DD"), with the PIN */
export async function POST(request: Request) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  const staffId = await currentStaff(request);
  if (!staffId) return error('Sesión vencida.', 401);
  const body = await readJson(request);
  const field = (name: string): unknown => (typeof body === 'object' && body !== null && name in body ? (body as Record<string, unknown>)[name] : null);
  const pin = await checkSalesPin(staffId, field('pin'));
  if (!pin.ok) return error(pin.error, pin.status);
  const from = field('desde');
  const to = field('hasta');
  const result = await listSales(typeof from === 'string' ? from : '', typeof to === 'string' ? to : '');
  return result.ok ? json(result.orders) : error(result.error, 400);
}
