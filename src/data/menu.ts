import { BUSINESS } from '@/config/business';
import type {
  BuildItem,
  BuildItemGroup,
  Category,
  CategoryId,
  CustomComboProduct,
  Product,
  ProductVariant,
  RollFlavor,
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
    description: `Rolls de autor, nigiris y acompañamientos, a tu gusto. Para el mismo día, pedilo hasta las ${BUSINESS.schedule.preorderCutoff}.`,
  },
  { id: 'sushiburgers', name: 'Sushiburgers', description: 'Nuestra fusión: arroz crocante en formato burger.' },
  { id: 'combos', name: 'Combos', description: 'Selecciones de la casa para compartir.' },
  { id: 'salsas', name: 'Salsas & complementos', description: 'Porciones extra para acompañar.' },
];

// ─── "Arma tu combo" builder (Paso 10, not wired to the UI yet) ──────────────

/** Placeholder until the real prices are defined; every BuildItem uses it */
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

// ─── Flavors for custom combos ───────────────────────────────────────────────

export const ROLL_FLAVORS: readonly RollFlavor[] = [
  { id: 'philadelphia', name: 'Philadelphia', description: 'Salmón, queso crema y palta.' },
  { id: 'new-york', name: 'New York', description: 'Salmón y palta, envuelto en sésamo.' },
  { id: 'tempura', name: 'Tempura Roll', description: 'Langostino tempura, queso crema y salsa teriyaki.', tags: ['mas-pedido'] },
  { id: 'acevichado', name: 'Acevichado', description: 'Langostino, palta y salsa acevichada.', tags: ['picante'] },
  { id: 'salmon-skin', name: 'Salmon Skin', description: 'Piel de salmón crocante, ciboulette y teriyaki.' },
  { id: 'veggie', name: 'Veggie Roll', description: 'Palta, pepino, zanahoria y queso crema.', tags: ['veggie'] },
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

  // Arma tu combo: interim size + flavors picker, replaced by BUILD_ITEMS in Paso 10
  {
    id: 'custom-15',
    type: 'custom-combo',
    orderType: 'preorder',
    categoryId: 'arma-tu-combo',
    name: 'Arma tu combo · 15 piezas',
    description: 'Elegí hasta 3 sabores.',
    price: 18900,
    imageUrl: '/images/menu/seleccion-de-autor.jpg',
    pieces: 15,
    maxFlavors: 3,
    available: true,
  },
  {
    id: 'custom-30',
    type: 'custom-combo',
    orderType: 'preorder',
    categoryId: 'arma-tu-combo',
    name: 'Arma tu combo · 30 piezas',
    description: 'Elegí hasta 5 sabores.',
    price: 34900,
    imageUrl: '/images/menu/seleccion-de-autor.jpg',
    pieces: 30,
    maxFlavors: 5,
    available: true,
  },
];

// ─── Selectors ──────────────────────────────────────────────────────────────

/** True if the product is enabled and, when day-restricted, offered on `date`'s weekday */
export const isAvailableOn = (product: Product, date: Date = new Date()): boolean => {
  if (!product.available) return false;
  if (!product.availableDays) return true;
  return product.availableDays.some((day) => day === date.getDay());
};

export const getProductsByCategory = (categoryId: CategoryId, date: Date = new Date()): Product[] =>
  PRODUCTS.filter((p) => p.categoryId === categoryId && isAvailableOn(p, date));

export const getProductById = (id: string): Product | undefined =>
  PRODUCTS.find((p) => p.id === id);

export const getFlavorById = (id: string): RollFlavor | undefined =>
  ROLL_FLAVORS.find((f) => f.id === id);

export const getBuildItemsByGroup = (group: BuildItemGroup): BuildItem[] =>
  BUILD_ITEMS.filter((item) => item.group === group && item.available);

/** Available custom combo sizes */
export const getCustomCombos = (date: Date = new Date()): CustomComboProduct[] =>
  PRODUCTS.filter((p): p is CustomComboProduct => p.type === 'custom-combo' && isAvailableOn(p, date));

/** True if any product in the category depends on the weekday (its contents vary by day) */
export const hasDayRestrictions = (categoryId: CategoryId): boolean =>
  PRODUCTS.some((p) => p.categoryId === categoryId && p.availableDays !== undefined);
