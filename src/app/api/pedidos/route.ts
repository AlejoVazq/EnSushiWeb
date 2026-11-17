import { getCustomerEmail } from '@/server/auth';
import { currentCustomer, error, json, ordersByAppEnabled, readJson } from '@/server/http';
import { createOrderFromRequest } from '@/server/orders';
import { allow, clientIp } from '@/server/rateLimit';

/** POST /api/pedidos: a customer (logged in or a guest) sends their order to the shop's app */
export async function POST(request: Request) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  const customerId = await currentCustomer();
  const email = customerId ? await getCustomerEmail(customerId) : null;
  // A session whose account is gone orders as a guest
  const who = customerId && email ? { customerId, email } : { customerId: null, email: null };
  const allowed =
    (who.customerId === null || allow(`pedido:${who.customerId}`, 10, 60 * 60 * 1000)) &&
    allow(`pedido-ip:${clientIp(request)}`, 20, 60 * 60 * 1000);
  if (!allowed) return error('Hiciste muchos pedidos seguidos. Escribinos por WhatsApp.', 429);

  const result = await createOrderFromRequest(who, await readJson(request));
  return result.ok ? json({ id: result.id }, 201) : error(result.error, result.status);
}
