import { connection } from 'next/server';

import { currentStaff, error, json, ordersByAppEnabled, readJson, requestDate } from '@/server/http';
import { applyMenuAction, getStaffMenu } from '@/server/liveMenu';

/** GET /api/local/menu: every item of the menu with today's sold-out marks, and whether orders are paused */
export async function GET(request: Request) {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  // Development: ?ahora picks the day, like on the web (the app never sends it)
  return json(await getStaffMenu(requestDate(new URL(request.url).searchParams.get('ahora'))));
}

/** PATCH /api/local/menu: `{ itemId, soldOut }` or `{ ordersPaused }`, only for today */
export async function PATCH(request: Request) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  const body = await readJson(request);
  const ahora = typeof body === 'object' && body !== null && 'ahora' in body ? body.ahora : null;
  const result = await applyMenuAction(body, requestDate(ahora));
  return result.ok ? json(result.menu) : error(result.error, result.status);
}
