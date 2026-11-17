import { connection } from 'next/server';

import { currentCustomer, error, json, ordersByAppEnabled } from '@/server/http';
import { getCustomerOrder } from '@/server/orders';

/** GET /api/pedidos/[id]: an order's status (a guest's with its link; an account's only with its session) */
export async function GET(_request: Request, { params }: RouteContext<'/api/pedidos/[id]'>) {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  const order = await getCustomerOrder(await currentCustomer(), (await params).id);
  return order ? json(order) : error('No encontramos ese pedido.', 404);
}
