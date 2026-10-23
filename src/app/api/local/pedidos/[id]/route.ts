import { currentStaff, error, json, ordersByAppEnabled, readJson } from '@/server/http';
import { applyStaffAction } from '@/server/orders';

/** PATCH /api/local/pedidos/[id]: confirm with a time, reject with a reason, or mark as printed */
export async function PATCH(request: Request, { params }: RouteContext<'/api/local/pedidos/[id]'>) {
  if (!ordersByAppEnabled()) return error('No disponible.', 404);
  if (!(await currentStaff(request))) return error('Sesión vencida.', 401);
  const result = await applyStaffAction((await params).id, await readJson(request));
  return result.ok ? json(result.order) : error(result.error, result.status);
}
