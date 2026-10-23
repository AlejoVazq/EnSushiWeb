import { connection } from 'next/server';

import { currentCustomer, error, json, ordersByAppEnabled } from '@/server/http';
import { getCustomerOrder } from '@/server/orders';

/** GET /api/pedidos/[id]: the customer's order status (only their own) */
export async function GET(_request: Request, { params }: RouteContext<'/api/pedidos/[id]'>) {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  const customerId = await currentCustomer();
  if (!customerId) return error('Sin sesión.', 401);
  const order = await getCustomerOrder(customerId, (await params).id);
  return order ? json(order) : error('No encontramos ese pedido.', 404);
}
