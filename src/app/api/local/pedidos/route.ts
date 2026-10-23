import { connection } from 'next/server';

import { currentStaff, error, json, ordersByAppEnabled } from '@/server/http';
import { listStaffOrders } from '@/server/orders';

/** GET /api/local/pedidos: the shop app's list (last 18 hours) */
export async function GET(request: Request) {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  return json(await listStaffOrders());
}
