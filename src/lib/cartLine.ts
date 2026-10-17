import { getFlavorById } from '@/data/menu';
import type { CartItem } from '@/types';

/** Display names of the flavors chosen for a custom combo line (empty for standard products) */
export const getLineFlavorNames = (item: CartItem): string[] =>
  (item.customization?.flavorIds ?? [])
    .map((id) => getFlavorById(id)?.name)
    .filter((name): name is string => name !== undefined);
