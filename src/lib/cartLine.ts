import { BUILD_CATEGORY_ID, CATEGORIES, getBoxSize } from '@/data/menu';
import type { BuildBox, BuildItem, CartItem } from '@/types';

const BOX_NAME = CATEGORIES.find((category) => category.id === BUILD_CATEGORY_ID)?.name ?? 'Arma tu combo';

/** "unidades" → "unidad", "piezas" → "pieza", "palitos" → "palito" */
const singular = (unitLabel: string): string =>
  unitLabel.endsWith('des') ? unitLabel.slice(0, -2) : unitLabel.replace(/s$/, '');

/** "5 piezas", "1 unidad", "6 unidades" */
export const formatUnits = (count: number, unitLabel: string): string =>
  `${count} ${count === 1 ? singular(unitLabel) : unitLabel}`;

/** Units of a build item in `steps` steps: 2 steps of a roll = 10 pieces */
export const stepUnits = (item: BuildItem, steps: number): number => item.step * steps;

/** "New York 10, Midori 5, Nigiri de salmón 5" */
export const formatBoxContents = (box: BuildBox): string =>
  box.entries.map((entry) => `${entry.item.name} ${stepUnits(entry.item, entry.steps)}`).join(', ');

/**
 * Line title, shared by the cart, the checkout and the WhatsApp message:
 * "Combo Kanituna · 25 piezas", "SushiBurger Salmón · Crudo", "Arma tu combo · Caja grande", "Empanaditas".
 */
export const getLineName = (item: CartItem): string => {
  switch (item.kind) {
    case 'box':
      return `${BOX_NAME} · ${getBoxSize(item.box.size)?.name ?? item.box.size}`;
    case 'extra':
      return item.item.name;
    case 'product':
      if (item.variant) return `${item.product.name} · ${item.variant.pieces} piezas`;
      if (item.optionValue) return `${item.product.name} · ${item.optionValue.label}`;
      return item.product.name;
  }
};

/** Second line in the cart and the checkout: a box's contents, or how many units an acompañamiento adds up to */
export const getLineDetail = (item: CartItem): string | null => {
  switch (item.kind) {
    case 'box':
      return formatBoxContents(item.box);
    case 'extra':
      return formatUnits(stepUnits(item.item, item.quantity), item.item.unitLabel);
    case 'product':
      return null;
  }
};
