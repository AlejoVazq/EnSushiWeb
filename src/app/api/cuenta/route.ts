import { cookies } from 'next/headers';
import { connection } from 'next/server';

import { CUSTOMER_COOKIE, customerCookieOptions, getCustomerEmail, renewSession } from '@/server/auth';
import { currentCustomer, error, json, ordersByAppEnabled } from '@/server/http';
import { getLastOrderDetails } from '@/server/orders';
import type { CustomerAccount } from '@/types/pedidos';

/**
 * GET /api/cuenta: who is logged in on this phone, with their last order's name, phone and address (CustomerAccount), or 401.
 * Each visit gives the session its 60 days again (database and cookie), so a regular customer stays logged in.
 */
export async function GET() {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  const customerId = await currentCustomer();
  const email = customerId ? await getCustomerEmail(customerId) : null;
  if (!customerId || !email) return error('Sin sesión.', 401);

  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (token && (await renewSession('customer', token))) store.set(CUSTOMER_COOKIE, token, customerCookieOptions());
  const account: CustomerAccount = { email, ...(await getLastOrderDetails(customerId)) };
  return json(account);
}
