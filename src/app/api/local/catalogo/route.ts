import { connection } from 'next/server';

import { currentStaff, error, json, ordersByAppEnabled, requestDate } from '@/server/http';
import { getStaffCatalog } from '@/server/manualOrders';

/** GET /api/local/catalogo: the menu with prices and today's sold-out marks, to load an order by hand */
export async function GET(request: Request) {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  return json(await getStaffCatalog(requestDate(new URL(request.url).searchParams.get('ahora'))));
}
