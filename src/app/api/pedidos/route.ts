import { getCustomerEmail } from '@/server/auth';
import { currentCustomer, error, json, ordersByAppEnabled, readJson } from '@/server/http';
import { createOrderFromRequest } from '@/server/orders';
import { allow, clientIp } from '@/server/rateLimit';

/** POST /api/pedidos: a logged-in customer sends their order to the shop's app */
export async function POST(request: Request) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  const customerId = await currentCustomer();
  const email = customerId ? await getCustomerEmail(customerId) : null;
  if (!customerId || !email) return error('Ingresá con tu correo para pedir.', 401);
  const allowed = allow(`pedido:${customerId}`, 10, 60 * 60 * 1000) && allow(`pedido-ip:${clientIp(request)}`, 20, 60 * 60 * 1000);
  if (!allowed) return error('Hiciste muchos pedidos seguidos. Escribinos por WhatsApp.', 429);

  const result = await createOrderFromRequest(customerId, email, await readJson(request));
  return result.ok ? json({ id: result.id }, 201) : error(result.error, result.status);
}
