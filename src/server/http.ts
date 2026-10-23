import { cookies } from 'next/headers';

import { CUSTOMER_COOKIE, readSession } from './auth';

export const json = (data: unknown, status = 200): Response => Response.json(data, { status });

export const error = (message: string, status: number): Response => json({ error: message }, status);

/** The request body as JSON, or null if it isn't */
export const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

/** Orders by app are off unless the server says so (`PEDIDOS_POR_APP=1`); the WhatsApp flow needs none of this */
export const ordersByAppEnabled = (): boolean => process.env.PEDIDOS_POR_APP === '1';

/** The logged-in customer's id, from their cookie */
export const currentCustomer = async (): Promise<string | null> => {
  const store = await cookies();
  return readSession('customer', store.get(CUSTOMER_COOKIE)?.value);
};

/** The shop app's token, from "Authorization: Bearer <token>" */
export const bearerToken = (request: Request): string | undefined =>
  request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];

export const currentStaff = (request: Request): Promise<string | null> => readSession('staff', bearerToken(request));
