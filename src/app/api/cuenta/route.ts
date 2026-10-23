import { connection } from 'next/server';

import { getCustomerEmail } from '@/server/auth';
import { currentCustomer, error, json, ordersByAppEnabled } from '@/server/http';

/** GET /api/cuenta: who is logged in on this phone ({ email }), or 401 */
export async function GET() {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  const customerId = await currentCustomer();
  const email = customerId ? await getCustomerEmail(customerId) : null;
  return email ? json({ email }) : error('Sin sesión.', 401);
}
