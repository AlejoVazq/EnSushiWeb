import { lookUpCode } from '@/lib/discounts';
import { currentCustomer, error, json, ordersByAppEnabled, readJson, requestDate } from '@/server/http';
import { checkServerCode } from '@/server/discounts';
import { allow, clientIp } from '@/server/rateLimit';

/**
 * POST /api/descuentos { codigo }: the checkout asks whether a typed code works. Answers with its definition (the
 * same shape as the site's own codes) so the page computes the discount; the order is checked again when it arrives.
 */
export async function POST(request: Request) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!allow(`descuento:${clientIp(request)}`, 20, 10 * 60 * 1000)) {
    return error('Probaste muchos códigos. Esperá unos minutos.', 429);
  }

  const body = await readJson(request);
  if (typeof body !== 'object' || body === null || !('codigo' in body) || typeof body.codigo !== 'string') {
    return error('Ingresá el código.', 400);
  }
  const record = body as Record<string, unknown>;
  const input = body.codigo.slice(0, 40);

  const server = await checkServerCode(input, await currentCustomer());
  if (server && !server.ok) return error(server.error, 409);
  const lookup = lookUpCode(input, requestDate(record.ahora), server?.ok ? [server.definition] : []);
  if (!lookup.ok) return error(lookup.error, 404);
  return json({ code: lookup.code, definition: lookup.definition });
}
