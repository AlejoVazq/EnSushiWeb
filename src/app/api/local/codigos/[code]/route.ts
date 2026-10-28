import { deleteCode, updateCode } from '@/server/discounts';
import { currentStaff, error, json, ordersByAppEnabled, readJson } from '@/server/http';

/** PATCH /api/local/codigos/[code]: change any field but the code (pause it with `{ active: false }`) */
export async function PATCH(request: Request, { params }: RouteContext<'/api/local/codigos/[code]'>) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  const result = await updateCode(decodeURIComponent((await params).code), await readJson(request));
  return result.ok ? json(result.code) : error(result.error, result.status);
}

/** DELETE /api/local/codigos/[code] */
export async function DELETE(request: Request, { params }: RouteContext<'/api/local/codigos/[code]'>) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  return (await deleteCode(decodeURIComponent((await params).code))) ? json({ ok: true }) : error('No existe ese código.', 404);
}
