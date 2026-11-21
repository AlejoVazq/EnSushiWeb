import { checkPassword } from './auth';
import { getDb } from './db';

/**
 * The PIN that opens the app's Ventas screen, whoever is logged in. It's set on the server with
 * `npm run pin-ventas` (only its scrypt hash is kept, in shop_settings) and can't be changed from the app.
 * With no PIN set, Ventas opens without asking.
 */

const SALES_PIN_KEY = 'sales_pin';
/** Wrong tries allowed per app user in this window */
const PIN_TRIES = 5;
const PIN_WINDOW_MS = 10 * 60_000;

/** Wrong tries per app user (in memory, like rateLimit.ts): every request of Ventas carries the PIN, so only misses count */
const misses = new Map<string, { count: number; resetAt: number }>();

const isLockedOut = (staffId: string): boolean => {
  const entry = misses.get(staffId);
  return entry !== undefined && entry.resetAt > Date.now() && entry.count >= PIN_TRIES;
};

const countMiss = (staffId: string) => {
  const now = Date.now();
  const entry = misses.get(staffId);
  if (!entry || entry.resetAt <= now) misses.set(staffId, { count: 1, resetAt: now + PIN_WINDOW_MS });
  else entry.count += 1;
};

export type PinCheck = { ok: true } | { ok: false; status: number; error: string };

const getSalesPinHash = async (): Promise<string | null> => {
  const db = await getDb();
  const [row] = await db.query<{ value: string }>('SELECT value FROM shop_settings WHERE key = $1', [SALES_PIN_KEY]);
  return row?.value ?? null;
};

export const isSalesPinSet = async (): Promise<boolean> => (await getSalesPinHash()) !== null;

/** Whether `pin` opens Ventas for this app user; wrong tries are limited */
export const checkSalesPin = async (staffId: string, pin: unknown): Promise<PinCheck> => {
  const hash = await getSalesPinHash();
  if (hash === null) return { ok: true };
  if (typeof pin !== 'string' || pin === '') return { ok: false, status: 403, error: 'Ventas pide el PIN.' };
  if (isLockedOut(staffId)) return { ok: false, status: 429, error: 'Demasiados intentos. Probá de nuevo en unos minutos.' };
  if (!(await checkPassword(pin, hash))) {
    countMiss(staffId);
    return { ok: false, status: 403, error: 'PIN incorrecto.' };
  }
  misses.delete(staffId);
  return { ok: true };
};
