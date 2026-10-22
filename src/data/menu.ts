import { BUSINESS } from '@/config/business';
import { getNow } from '@/lib/schedule';
import type {
  BuildItem,
  BuildItemGroup,
  Category,
  CategoryId,
  Product,
  ProductVariant,
  SizedProduct,
  StandardProduct,
} from '@/types';

/**
 * Single source of truth for the catalog.
 * Combos, Sushiburgers and Salsas have real prices; Arma tu combo is still a placeholder (prices TBD).
 */

// ─── Categories (display order) ─────────────────────────────────────────────

export const CATEGORIES: readonly Category[] = [
  {
    id: 'arma-tu-combo',
    name: 'Arma tu combo',
    description: `Elegí una caja y llenala con rolls de autor y nigiris (hasta las ${BUSINESS.schedule.preorderCutoff}).`,
  },
  { id: 'sushiburgers', name: 'Sushiburgers', description: 'Nuestra fusión: arroz crocante en formato burger.' },
  {
    id: 'acompanamientos',
    name: 'Acompañamientos',
    description: 'Para sumar a tu pedido. Se piden solos, también después de las 20:00.',
  },
  { id: 'combos', name: 'Combos', description: 'Selecciones de la casa para compartir.' },
  { id: 'salsas', name: 'Salsas & complementos', description: 'Porciones extra para acompañar.' },
];

// ─── "Arma tu combo" builder ─────────────────────────────────────────────────

/** The category whose tab shows the box builder instead of product rows */
export const BUILD_CATEGORY_ID: CategoryId = 'arma-tu-combo';

/** The category whose tab lists the acompañamientos (build items ordered on their own) */
export const EXTRAS_CATEGORY_ID: CategoryId = 'acompanamientos';

/** Box sizes in pieces; a box must be filled exactly. A nigiri counts as one piece. */
export const BUILD_BOX_SIZES: readonly number[] = [10, 15, 20, 25, 30];

/** Groups that fill the box and stop at the preorder cutoff; the rest go to the order on their own */
const BOX_GROUPS: readonly BuildItemGroup[] = ['rolls', 'nigiris'];

/** Placeholder until the real prices are defined; every BuildItem uses it (Arma tu combo doesn't ship until then) */
const PRICE_TBD = 1000;

export const BUILD_ITEM_GROUPS: readonly { id: BuildItemGroup; name: string }[] = [
  { id: 'rolls', name: 'Rolls de autor' },
  { id: 'nigiris', name: 'Nigiris' },
  { id: 'acompanamientos', name: 'Acompañamientos' },
];

/** "Rolls de autor" item, sold in steps of 5 pieces */
const roll = (id: string, name: string): BuildItem => ({
  id,
  group: 'rolls',
  name,
  step: 5,
  unitLabel: 'piezas',
  price: PRICE_TBD,
  available: true,
});

export const BUILD_ITEMS: readonly BuildItem[] = [
  roll('roll-new-york', 'New York'),
  roll('roll-sake', 'Sake'),
  roll('roll-midori', 'Midori'),
  roll('roll-hikaru', 'Hikaru'),
  roll('roll-sakana-maki', 'Sakana Maki'),
  roll('roll-tuna-spicy', 'TunaSpicy'),
  { id: 'nigiri-salmon', group: 'nigiris', name: 'Nigiri de salmón', step: 1, unitLabel: 'unidades', price: PRICE_TBD, available: true },
  { id: 'empanaditas', group: 'acompanamientos', name: 'Empanaditas', step: 3, unitLabel: 'unidades', price: PRICE_TBD, available: true },
  { id: 'langostinos-empanados', group: 'acompanamientos', name: 'Langostinos empanados', step: 5, unitLabel: 'palitos', price: PRICE_TBD, available: true },
  { id: 'pollo-tandoori', group: 'acompanamientos', name: 'Pollo tandoori', step: 5, unitLabel: 'palitos', price: PRICE_TBD, available: true },
];

// ─── Products ───────────────────────────────────────────────────────────────

/** Combo sizes share the piece counts; only prices change per combo */
const comboSizes = (p15: number, p24: number, p40: number): ProductVariant[] => [
  { pieces: 15, price: p15 },
  { pieces: 24, price: p24 },
  { pieces: 40, price: p40 },
];

/** Express combo in 15/24/40 pieces, image path derived from its id */
const combo = (id: string, name: string, description: string, variants: ProductVariant[]): SizedProduct => ({
  id,
  type: 'sized',
  orderType: 'express',
  categoryId: 'combos',
  name,
  description,
  variants,
  imageUrl: `/images/menu/${id}.jpg`,
  available: true,
});

/** Express standard product */
const express = (product: Omit<StandardProduct, 'type' | 'orderType' | 'available'>): StandardProduct => ({
  type: 'standard',
  orderType: 'express',
  available: true,
  ...product,
});

export const PRODUCTS: readonly Product[] = [
  // Combos
  combo('combo-kanituna', 'Combo Kanituna', 'Kanikama y atún.', comboSizes(20000, 36000, 45000)),
  combo('combo-green', 'Combo Green', 'Mango y ciboulette.', comboSizes(22000, 38000, 47000)),
  combo('combo-ensushi', 'Combo Ensushi', 'Salmón, veggie y kanikama.', comboSizes(29000, 45000, 52000)),
  combo('combo-tunasalm', 'Combo TunaSalm', 'Salmón y atún.', comboSizes(25000, 42000, 50000)),
  combo('combo-salmon', 'Combo Salmón', 'Salmón.', comboSizes(34000, 53000, 64000)),
  combo('combo-ocean-duo', 'Combo Ocean Duo', 'Salmón y langostinos.', comboSizes(31000, 50000, 60000)),


  // Sushiburgers
  express({
    id: 'sb-salmon',
    categoryId: 'sushiburgers',
    name: 'SushiBurger Salmón',
    description: 'Salmón (cocido o crudo), palta y queso philly entre dos panes de arroz empanizados y fritos. Incluye nachos y guacamole.',
    price: 15000,
    imageUrl: '/images/menu/sb-salmon.jpg',
    // TODO: one photo per version (imageUrl on each value) once they're taken
    option: {
      name: 'Salmón',
      values: [
        { id: 'crudo', label: 'Crudo' },
        { id: 'cocido', label: 'Cocido' },
      ],
    },
  }),
  express({
    id: 'sb-langostinos',
    categoryId: 'sushiburgers',
    name: 'SushiBurger Langostinos',
    description: 'Langostinos empanados en panko, palta y queso philly entre dos panes de arroz empanizados y fritos. Incluye nachos y guacamole.',
    price: 14000,
    imageUrl: '/images/menu/sb-langostinos.jpg',
  }),

  // Salsas: one product each, so the order says exactly which one
  express({
    id: 'salsa-teriyaki',
    categoryId: 'salsas',
    name: 'Salsa Teriyaki',
    description: 'Dulce, hecha con salsa de soja, jengibre, ajo y miel.',
    price: 1500,
  }),
  express({
    id: 'salsa-buenos-aires',
    categoryId: 'salsas',
    name: 'Salsa Buenos Aires',
    description: 'Base de teriyaki con aceite de sésamo, semillas de sésamo y ralladura de limón.',
    price: 1500,
  }),
  express({ id: 'salsa-agridulce', categoryId: 'salsas', name: 'Salsa Agridulce', price: 1500 }),

];

// ─── Selectors ──────────────────────────────────────────────────────────────

/** True if the product is on the menu on `date`'s weekday (always, unless day-restricted) */
const isOfferedOn = (product: Product, date: Date): boolean =>
  !product.availableDays || product.availableDays.some((day) => day === date.getDay());

/** True if the product is enabled and, when day-restricted, offered on `date`'s weekday */
export const isAvailableOn = (product: Product, date: Date = getNow()): boolean =>
  product.available && isOfferedOn(product, date);

export const getProductsByCategory = (categoryId: CategoryId, date: Date = getNow()): Product[] =>
  PRODUCTS.filter((p) => p.categoryId === categoryId && isAvailableOn(p, date));

/** What the menu shows on `date`: like getProductsByCategory, but sold-out products (`available: false`) stay listed */
export const getMenuByCategory = (categoryId: CategoryId, date: Date = getNow()): Product[] =>
  PRODUCTS.filter((p) => p.categoryId === categoryId && isOfferedOn(p, date));

export const getProductById = (id: string): Product | undefined =>
  PRODUCTS.find((p) => p.id === id);

/** Every item of the group, sold-out ones included (the builder lists them greyed out, like the menu) */
export const getBuildItemsByGroup = (group: BuildItemGroup): BuildItem[] =>
  BUILD_ITEMS.filter((item) => item.group === group);

export const getBuildItemById = (id: string): BuildItem | undefined =>
  BUILD_ITEMS.find((item) => item.id === id);

/** True for rolls and nigiris: they fill the box and stop at the preorder cutoff */
export const isBoxItem = (item: BuildItem): boolean => BOX_GROUPS.includes(item.group);

/** True if any product in the category depends on the weekday (its contents vary by day) */
export const hasDayRestrictions = (categoryId: CategoryId): boolean =>
  PRODUCTS.some((p) => p.categoryId === categoryId && p.availableDays !== undefined);
