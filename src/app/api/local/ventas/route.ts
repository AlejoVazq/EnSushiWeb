import { connection } from 'next/server';

import { currentStaff, error, json, ordersByAppEnabled } from '@/server/http';
import { listSales } from '@/server/orders';

/** GET /api/local/ventas?desde=AAAA-MM-DD&hasta=AAAA-MM-DD: the confirmed orders of those days, for the sales export */
export async function GET(request: Request) {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  const params = new URL(request.url).searchParams;
  const result = await listSales(params.get('desde') ?? '', params.get('hasta') ?? '');
  return result.ok ? json(result.orders) : error(result.error, 400);
}
