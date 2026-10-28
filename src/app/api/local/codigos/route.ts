import { connection } from 'next/server';

import { createCode, listCodes } from '@/server/discounts';
import { currentStaff, error, json, ordersByAppEnabled, readJson } from '@/server/http';

/** GET /api/local/codigos: every discount code, with how many orders used it */
export async function GET(request: Request) {
  await connection();
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  return json(await listCodes());
}

/** POST /api/local/codigos: a new code */
export async function POST(request: Request) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  const result = await createCode(await readJson(request));
  return result.ok ? json(result.code, 201) : error(result.error, result.status);
}
