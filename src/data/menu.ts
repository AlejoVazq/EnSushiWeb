import { BUSINESS } from '@/config/business';
import { getNow } from '@/lib/schedule';
import type {
  BuildBoxSize,
  BuildBoxSizeId,
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
 * Combos, Sushiburgers (except Atún y ciboulette) and Salsas have real prices; Arma tu combo, the acompañamientos
 * and SushiBurger Atún y ciboulette still use PRICE_TBD.
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
    description: 'Para sumar a tu pedido. Se piden solos, también después de las 19:30.',
  },
  { id: 'combos', name: 'Combos', description: 'Selecciones de la casa para compartir.' },
  { id: 'salsas', name: 'Salsas & complementos', description: 'Porciones extra para acompañar.' },
];

// ─── "Arma tu combo" builder ─────────────────────────────────────────────────

/** The category whose tab shows the box builder instead of product rows */
export const BUILD_CATEGORY_ID: CategoryId = 'arma-tu-combo';

/** The category whose tab lists the acompañamientos (build items ordered on their own) */
export const EXTRAS_CATEGORY_ID: CategoryId = 'acompanamientos';

/**
 * The two physical boxes and what fits in each (nigiris take more room than roll pieces, so the list is explicit).
 * Both come with salsas and palitos (chica 1 + 1, grande 2 + 2); the builder doesn't show it, the shop adds them.
 */
export const BUILD_BOX_SIZES: readonly BuildBoxSize[] = [
  {
    id: 'chica',
    name: 'Caja chica',
    maxPieces: 15,
    combinations: [
      { rollPieces: 15, nigiris: { min: 0, max: 0 } },
      { rollPieces: 10, nigiris: { min: 0, max: 3 } },
      { rollPieces: 0, nigiris: { min: 6, max: 8 } },
    ],
  },
  {
    id: 'grande',
    name: 'Caja grande',
    maxPieces: 30,
    combinations: [
      { rollPieces: 30, nigiris: { min: 0, max: 0 } },
      { rollPieces: 25, nigiris: { min: 0, max: 0 } },
      { rollPieces: 20, nigiris: { min: 0, max: 6 } },
      { rollPieces: 15, nigiris: { min: 1, max: 9 } },
    ],
  },
];

export const getBoxSize = (id: BuildBoxSizeId): BuildBoxSize | undefined =>
  BUILD_BOX_SIZES.find((size) => size.id === id);

/** Groups that fill the box and stop at the preorder cutoff; the rest go to the order on their own */
const BOX_GROUPS: readonly BuildItemGroup[] = ['rolls', 'nigiris'];

/** Placeholder until the real prices are defined: every BuildItem and SushiBurger Atún y ciboulette (none ships until then) */
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
  { id: 'nigiri-langostino', group: 'nigiris', name: 'Nigiri de langostino', step: 1, unitLabel: 'unidades', price: PRICE_TBD, available: true },
  // TODO: the three flavors (names still to be defined)
  { id: 'gyosas-1', group: 'acompanamientos', name: 'Gyosas · Sabor 1', step: 3, unitLabel: 'unidades', price: PRICE_TBD, available: true },
  { id: 'gyosas-2', group: 'acompanamientos', name: 'Gyosas · Sabor 2', step: 3, unitLabel: 'unidades', price: PRICE_TBD, available: true },
  { id: 'gyosas-3', group: 'acompanamientos', name: 'Gyosas · Sabor 3', step: 3, unitLabel: 'unidades', price: PRICE_TBD, available: true },
  { id: 'langostinos-empanados', group: 'acompanamientos', name: 'Langostinos empanados', step: 5, unitLabel: 'unidades', price: PRICE_TBD, available: true },
  { id: 'pollo-tandoori', group: 'acompanamientos', name: 'Pollo tandoori', step: 5, unitLabel: 'unidades', price: PRICE_TBD, available: true },
  // TODO: confirm how many come per portion (5 for now, like langostinos and pollo)
  { id: 'geishas', group: 'acompanamientos', name: 'Geishas', step: 5, unitLabel: 'unidades', price: PRICE_TBD, available: true },
];

// ─── Products ───────────────────────────────────────────────────────────────

/** Combo sizes share the piece counts and what comes with them; only prices change per combo */
const comboSizes = (p15: number, p25: number, p40: number): ProductVariant[] => [
  { pieces: 15, price: p15, includes: { salsas: 1, palitos: 1 } },
  { pieces: 25, price: p25, includes: { salsas: 2, palitos: 2 } },
  // A small box of 15 and a large one of 25
  { pieces: 40, price: p40, includes: { salsas: 3, palitos: 3 } },
];

/** Express combo in 15/25/40 pieces, image path derived from its id; `hasPhoto: false` until its photo is in public/images/menu */
const combo = (
  id: string,
  name: string,
  description: string,
  variants: ProductVariant[],
  { hasPhoto = true }: { hasPhoto?: boolean } = {},
): SizedProduct => ({
  id,
  type: 'sized',
  orderType: 'express',
  categoryId: 'combos',
  name,
  description,
  variants,
  ...(hasPhoto && { imageUrl: `/images/menu/${id}.jpg` }),
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
  combo('combo-tunasalm', 'Combo TunaSalm', 'Salmón y atún.', comboSizes(25000, 42000, 50000), { hasPhoto: false }),
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
  express({
    id: 'sb-atun-ciboulette',
    categoryId: 'sushiburgers',
    name: 'SushiBurger Atún y ciboulette',
    // TODO: real price, full description (ingredients) and photo
    description: 'Atún y ciboulette entre dos panes de arroz empanizados y fritos. Incluye nachos y guacamole.',
    price: PRICE_TBD,
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
  express({
    id: 'salsa-soja',
    categoryId: 'salsas',
    name: 'Salsa de soja',
    description: 'La clásica, salada, para mojar rolls y nigiris.',
    price: 500,
  }),
  express({ id: 'wasabi', categoryId: 'salsas', name: 'Wasabi', price: 500 }),
  express({
    id: 'palitos',
    categoryId: 'salsas',
    name: 'Palitos',
    description: 'Par extra. Los combos y las cajas ya traen los suyos.',
    price: 200,
  }),

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
