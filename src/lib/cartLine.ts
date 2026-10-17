import { getFlavorById } from '@/data/menu';
import type { CartItem } from '@/types';

/** Display names of the flavors chosen for a custom combo line (empty for standard products) */
export const getLineFlavorNames = (item: CartItem): string[] =>
  (item.customization?.flavorIds ?? [])
    .map((id) => getFlavorById(id)?.name)
    .filter((name): name is string => name !== undefined);

/** Product name plus the chosen size for sized products: "Combo Kanituna · 24 piezas" */
export const getLineName = (item: CartItem): string =>
  item.variant ? `${item.product.name} · ${item.variant.pieces} piezas` : item.product.name;
