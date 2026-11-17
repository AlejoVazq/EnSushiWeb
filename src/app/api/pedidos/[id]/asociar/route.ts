import { currentCustomer, error, json, ordersByAppEnabled } from '@/server/http';
import { linkGuestOrder } from '@/server/orders';

/** POST /api/pedidos/[id]/asociar: a guest who just registered keeps that order in their account */
export async function POST(_request: Request, { params }: RouteContext<'/api/pedidos/[id]/asociar'>) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  const customerId = await currentCustomer();
  if (!customerId) return error('Ingresá con tu correo.', 401);
  const linked = await linkGuestOrder(customerId, (await params).id);
  return linked ? json({ ok: true }) : error('No encontramos ese pedido.', 404);
}
