import { DISCOUNT_CODES, SPECIAL_DAYS } from '@/config/discounts';
import { getShopDate } from '@/lib/schedule';
import { sha256 } from '@/lib/sha256';
import { cartTotal } from '@/lib/cartItems';
import type { CartItem, DiscountCode, OrderDiscount, SpecialDay } from '@/types';

/** Only these products get the special day's discount (Arma tu combo boxes don't) */
const SPECIAL_DAY_CATEGORY = 'combos';

/** "  verano10 " → "VERANO10": how a code is typed doesn't matter */
export const normalizeCode = (code: string): string => code.trim().toUpperCase();

/** Today's special day, if any */
export const getSpecialDay = (date: Date): SpecialDay | null =>
  SPECIAL_DAYS.find((day) => day.date === getShopDate(date)) ?? null;

/** Integer ARS taken off one unit at `percent` */
const percentOff = (price: number, percent: number): number => Math.round((price * percent) / 100);

/** A combo's price on a special day, per unit: what the size chip shows */
export const specialDayPrice = (price: number, day: SpecialDay): number => price - percentOff(price, day.percent);

/** Combos at the day's percent, unit by unit so it adds up to what the chips show */
export const getSpecialDayDiscount = (items: readonly CartItem[], day: SpecialDay | null): OrderDiscount | null => {
  if (!day) return null;
  const amount = items.reduce(
    (sum, item) =>
      item.kind === 'product' && item.product.categoryId === SPECIAL_DAY_CATEGORY
        ? sum + percentOff(item.unitPrice, day.percent) * item.quantity
        : sum,
    0,
  );
  return amount > 0 ? { label: `${day.percent}% en Combos`, amount } : null;
};

export type CodeLookup = { ok: true; code: string; definition: DiscountCode } | { ok: false; error: string };

/**
 * Checks a typed code against the list, on `date` in the shop's time zone. `extraCodes` are the ones the server
 * vouched for (orders by app: codes managed from the shop's app live in its database, not in this file).
 */
export const lookUpCode = (input: string, date: Date, extraCodes: readonly DiscountCode[] = []): CodeLookup => {
  const code = normalizeCode(input);
  if (!code) return { ok: false, error: 'Ingresá el código.' };
  const hash = sha256(code);
  const definition = extraCodes.find((entry) => entry.hash === hash) ?? DISCOUNT_CODES.find((entry) => entry.hash === hash);
  if (!definition) return { ok: false, error: 'Ese código no existe. Revisá que esté bien escrito.' };
  const today = getShopDate(date);
  if (definition.validFrom && today < definition.validFrom) return { ok: false, error: 'Ese código todavía no está activo.' };
  if (definition.validUntil && today > definition.validUntil) return { ok: false, error: 'Ese código ya venció.' };
  return { ok: true, code, definition };
};

/** What the code takes off the items (never the delivery fee), never more than they cost */
export const getCodeDiscount = (items: readonly CartItem[], code: string, definition: DiscountCode): OrderDiscount | null => {
  const subtotal = cartTotal(items);
  const amount =
    definition.kind === 'percent' ? percentOff(subtotal, definition.value) : Math.min(definition.value, subtotal);
  return amount > 0 ? { label: code, amount } : null;
};

/** The discount the order gets: the code's or the special day's, whichever saves more (they don't stack) */
export const getBestDiscount = (
  items: readonly CartItem[],
  { code, date, extraCodes = [] }: { code: string; date: Date; extraCodes?: readonly DiscountCode[] },
): OrderDiscount | null => {
  const lookup = code ? lookUpCode(code, date, extraCodes) : null;
  const fromCode = lookup?.ok ? getCodeDiscount(items, lookup.code, lookup.definition) : null;
  const fromDay = getSpecialDayDiscount(items, getSpecialDay(date));
  if (!fromCode) return fromDay;
  if (!fromDay) return fromCode;
  return fromCode.amount >= fromDay.amount ? fromCode : fromDay;
};
