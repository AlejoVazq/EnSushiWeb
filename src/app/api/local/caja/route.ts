import { connection } from 'next/server';

import { getCashDay, setOpeningAmount } from '@/server/cash';
import { currentStaff, error, json, ordersByAppEnabled, readJson, requestDate } from '@/server/http';

/** GET /api/local/caja: today's drawer (its opening amount) and the day's confirmed orders */
export async function GET(request: Request) {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  // Development: ?ahora picks the day, like the menu's route (the app never sends it)
  return json(await getCashDay(requestDate(new URL(request.url).searchParams.get('ahora'))));
}

/** PATCH /api/local/caja { openingAmount }: what today's drawer started with */
export async function PATCH(request: Request) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  const body = await readJson(request);
  const ahora = typeof body === 'object' && body !== null && 'ahora' in body ? body.ahora : null;
  const result = await setOpeningAmount(body, requestDate(ahora));
  return result.ok ? json(result.cash) : error(result.error, result.status);
}
