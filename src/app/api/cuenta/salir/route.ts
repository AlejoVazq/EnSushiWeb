import { cookies } from 'next/headers';

import { CUSTOMER_COOKIE, deleteSession } from '@/server/auth';
import { json } from '@/server/http';

/** POST /api/cuenta/salir: logs this phone out */
export async function POST() {
  const store = await cookies();
  await deleteSession(store.get(CUSTOMER_COOKIE)?.value);
  store.delete(CUSTOMER_COOKIE);
  return json({ ok: true });
}
