import { BUSINESS } from '@/config/business';
import { getShopDate } from '@/lib/schedule';
import type { StaffCashDay } from '@/types/pedidos';

import { getDb } from './db';
import { MAX_CASH, toStaffOrder, type OrderRow } from './orders';

/**
 * The shop's cash drawer, one day at a time: what it starts with (change in small bills), loaded from the app.
 * The rest (cash orders, what each delivery driver took and handed in) comes from the day's orders; the app adds it up.
 */

/** How far back the app's list of drivers to pick from goes */
const DRIVER_DAYS = 60;

/** GET /api/local/caja */
export const getCashDay = async (date: Date): Promise<StaffCashDay> => {
  const day = getShopDate(date);
  const db = await getDb();
  const [opening, orders, drivers] = await Promise.all([
    db.query<{ opening_amount: number }>('SELECT opening_amount FROM cash_days WHERE day = $1', [day]),
    db.query<OrderRow>(
      `SELECT * FROM orders
       WHERE status = 'confirmado' AND (created_at AT TIME ZONE $2)::date = $1::date
       ORDER BY created_at`,
      [day, BUSINESS.schedule.timeZone],
    ),
    db.query<{ driver: string }>(
      `SELECT driver FROM orders
       WHERE driver IS NOT NULL AND created_at > now() - make_interval(days => $1)
       GROUP BY driver ORDER BY max(created_at) DESC LIMIT 20`,
      [DRIVER_DAYS],
    ),
  ]);
  return {
    day,
    openingAmount: opening[0]?.opening_amount ?? null,
    orders: orders.map(toStaffOrder),
    drivers: drivers.map((row) => row.driver),
  };
};

export type CashWriteResult = { ok: true; cash: StaffCashDay } | { ok: false; status: number; error: string };

/** PATCH /api/local/caja { openingAmount }: only today's drawer */
export const setOpeningAmount = async (body: unknown, date: Date): Promise<CashWriteResult> => {
  const amount = typeof body === 'object' && body !== null && 'openingAmount' in body ? body.openingAmount : undefined;
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 0 || amount > MAX_CASH) {
    return { ok: false, status: 400, error: 'El monto va en pesos, sin centavos.' };
  }
  const db = await getDb();
  await db.query(
    `INSERT INTO cash_days (day, opening_amount) VALUES ($1, $2)
     ON CONFLICT (day) DO UPDATE SET opening_amount = EXCLUDED.opening_amount, updated_at = now()`,
    [getShopDate(date), amount],
  );
  return { ok: true, cash: await getCashDay(date) };
};
