import type { DiscountCode, SpecialDay } from '@/types';

/**
 * Discounts. A code and a special day never stack: the order gets whichever saves more.
 * Everything here ships in the site's JS, so codes are stored only as their SHA-256.
 */

/**
 * Dates with a discount on every Combo (not on Arma tu combo boxes), in the shop's time zone.
 * Example: { date: '2026-11-13', percent: 15 }
 */
export const SPECIAL_DAYS: readonly SpecialDay[] = [];

/**
 * Codes the shop hands out, for the whole order (not the delivery fee).
 * Managed with `npm run codigo -- VERANO10 10%` (or `-- BIENVENIDA 2000` for $ 2.000 off, optionally followed
 * by a last day, `2026-12-31`), which writes the entry here; `npm run codigo -- --borrar VERANO10` removes it.
 */
export const DISCOUNT_CODES: readonly DiscountCode[] = [];
