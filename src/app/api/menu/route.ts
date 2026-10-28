import { connection } from 'next/server';

import { error, json, ordersByAppEnabled, requestDate } from '@/server/http';
import { getLiveMenu } from '@/server/liveMenu';

/** GET /api/menu: what's sold out today and whether orders are paused, set from the shop's app */
export async function GET(request: Request) {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  // Development: the page's simulated time (?ahora) picks the day
  const date = requestDate(new URL(request.url).searchParams.get('ahora'));
  return json(await getLiveMenu(date));
}
