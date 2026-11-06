import { currentStaff, error, json, ordersByAppEnabled, readJson, requestDate } from '@/server/http';
import { quoteManualOrder } from '@/server/manualOrders';

/** POST /api/local/pedidos/presupuesto: the amounts of an order being loaded by hand; nothing is saved */
export async function POST(request: Request) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  const body = await readJson(request);
  const ahora = typeof body === 'object' && body !== null && 'ahora' in body ? body.ahora : null;
  const result = await quoteManualOrder(body, requestDate(ahora));
  return result.ok ? json(result.quote) : error(result.error, result.status);
}
