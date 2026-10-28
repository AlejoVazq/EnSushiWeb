import {
  BUILD_CATEGORY_ID,
  EXTRAS_CATEGORY_ID,
  MENU_CATEGORIES,
  PRODUCTS,
  getBuildItemsByGroup,
} from '@/data/menu';
import { getShopDate } from '@/lib/schedule';
import type { LiveMenu, StaffMenu, StaffMenuItem } from '@/types/pedidos';

import { getDb } from './db';

/**
 * What the shop changes from its app for one day: items sold out and orders paused. Both are kept by the shop's
 * date, so they're gone the next day without anyone undoing them.
 */

/** The items of each tab, as the shop sees them in its app (hidden tabs aren't there) */
const menuGroups = (): { name: string; items: { id: string; name: string; available: boolean }[] }[] =>
  MENU_CATEGORIES.map((category) => {
    if (category.id === BUILD_CATEGORY_ID) {
      return { name: category.name, items: [...getBuildItemsByGroup('rolls'), ...getBuildItemsByGroup('nigiris')] };
    }
    if (category.id === EXTRAS_CATEGORY_ID) return { name: category.name, items: getBuildItemsByGroup('acompanamientos') };
    return { name: category.name, items: PRODUCTS.filter((product) => product.categoryId === category.id) };
  });

const KNOWN_IDS = new Set(menuGroups().flatMap((group) => group.items.map((item) => item.id)));

export const getLiveMenu = async (date: Date): Promise<LiveMenu> => {
  const day = getShopDate(date);
  const db = await getDb();
  const [soldOut, paused] = await Promise.all([
    db.query<{ item_id: string }>('SELECT item_id FROM sold_out WHERE day = $1', [day]),
    db.query<{ day: string }>('SELECT day FROM orders_paused WHERE day = $1', [day]),
  ]);
  return { soldOut: soldOut.map((row) => row.item_id), ordersPaused: paused.length > 0 };
};

export const getStaffMenu = async (date: Date): Promise<StaffMenu> => {
  const live = await getLiveMenu(date);
  const soldOut = new Set(live.soldOut);
  return {
    day: getShopDate(date),
    ordersPaused: live.ordersPaused,
    groups: menuGroups().map((group) => ({
      name: group.name,
      items: group.items.map(
        (item): StaffMenuItem => ({
          id: item.id,
          name: item.name,
          soldOut: !item.available || soldOut.has(item.id),
          locked: !item.available,
        }),
      ),
    })),
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export type StaffMenuResult = { ok: true; menu: StaffMenu } | { ok: false; status: number; error: string };

/** PATCH /api/local/menu: `{ itemId, soldOut }` or `{ ordersPaused }`, for today */
export const applyMenuAction = async (body: unknown, date: Date): Promise<StaffMenuResult> => {
  if (!isRecord(body)) return { ok: false, status: 400, error: 'Acción inválida.' };
  const day = getShopDate(date);
  const db = await getDb();

  if (typeof body.ordersPaused === 'boolean') {
    await db.query(
      body.ordersPaused
        ? 'INSERT INTO orders_paused (day) VALUES ($1) ON CONFLICT (day) DO NOTHING'
        : 'DELETE FROM orders_paused WHERE day = $1',
      [day],
    );
  } else if (typeof body.itemId === 'string' && typeof body.soldOut === 'boolean') {
    if (!KNOWN_IDS.has(body.itemId)) return { ok: false, status: 404, error: 'No existe ese producto.' };
    await db.query(
      body.soldOut
        ? 'INSERT INTO sold_out (item_id, day) VALUES ($1, $2) ON CONFLICT (item_id, day) DO NOTHING'
        : 'DELETE FROM sold_out WHERE item_id = $1 AND day = $2',
      [body.itemId, day],
    );
  } else {
    return { ok: false, status: 400, error: 'Acción inválida.' };
  }
  return { ok: true, menu: await getStaffMenu(date) };
};

