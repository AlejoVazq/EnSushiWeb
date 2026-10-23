import { formatUnits, getLineName, stepUnits } from '@/lib/cartLine';
import { formatPrice } from '@/lib/format';
import type { CartItem } from '@/types';

/** The line's count as the WhatsApp message writes it: acompañamientos count real units (6× Gyosas) */
export const lineCount = (item: CartItem): number =>
  item.kind === 'extra' ? stepUnits(item.item, item.quantity) : item.quantity;

/** "2× Combo Kanituna · 25 piezas", the same shape as the message line (cart and checkout) */
export const lineTitle = (item: CartItem): string => `${lineCount(item)}× ${getLineName(item)}`;

/** "$ 1.000 c/u", or per portion for acompañamientos: "$ 1.000 cada 3 unidades" */
export const unitPriceText = (item: CartItem): string =>
  item.kind === 'extra'
    ? `${formatPrice(item.unitPrice)} cada ${formatUnits(item.item.step, item.item.unitLabel)}`
    : `${formatPrice(item.unitPrice)} c/u`;
