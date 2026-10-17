import { BUSINESS } from '@/config/business';
import type {
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
 * Combos, Sushiburgers and Salsas have real prices; Selección de autor and Arma tu combo are still placeholders.
 */

// ─── Categories (display order) ─────────────────────────────────────────────

export const CATEGORIES: readonly Category[] = [
  { id: 'combos', name: 'Combos', description: 'Selecciones de la casa para compartir.' },
  {
    id: 'seleccion-de-autor',
    name: 'Selección de autor',
    description: `Combos premium por encargo. Pedilos antes de las ${BUSINESS.schedule.preorderCutoff} para esa misma noche.`,
  },
  { id: 'sushiburgers', name: 'Sushiburgers', description: 'Nuestra fusión: arroz crocante en formato burger.' },
  { id: 'arma-tu-combo', name: 'Arma tu combo', description: 'Elegí el tamaño y tus sabores favoritos.' },
  { id: 'salsas', name: 'Salsas', description: 'Porciones extra para acompañar.' },
];

// ─── Flavors for "Arma tu combo" ────────────────────────────────────────────

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

  // Selección de autor (examples until the real premium menu is defined)
  {
    id: 'autor-nigiris-premium',
    type: 'standard',
    orderType: 'preorder',
    categoryId: 'seleccion-de-autor',
    name: 'Nigiris Premium',
    price: 28900,
    imageUrl: '/images/menu/autor-nigiris-premium.jpg',
    available: true,
  },
  {
    id: 'autor-geishas-salmon',
    type: 'standard',
    orderType: 'preorder',
    categoryId: 'seleccion-de-autor',
    name: 'Geishas de Salmón',
    price: 24900,
    imageUrl: '/images/menu/autor-geishas-salmon.jpg',
    available: true,
  },

  // Sushiburgers
  express({
    id: 'sb-salmon',
    categoryId: 'sushiburgers',
    name: 'SushiBurger Salmón',
    price: 15000,
    imageUrl: '/images/menu/sb-salmon.jpg',
  }),
  express({
    id: 'sb-langostinos',
    categoryId: 'sushiburgers',
    name: 'SushiBurger Langostinos',
    price: 14000,
    imageUrl: '/images/menu/sb-langostinos.jpg',
  }),

  // Salsas: one product each, so the order says exactly which one
  express({ id: 'salsa-teriyaki', categoryId: 'salsas', name: 'Salsa Teriyaki', price: 1500 }),
  express({ id: 'salsa-buenos-aires', categoryId: 'salsas', name: 'Salsa Buenos Aires', price: 1500 }),
  express({ id: 'salsa-agridulce', categoryId: 'salsas', name: 'Salsa Agridulce', price: 1500 }),

  // Arma tu combo
  {
    id: 'custom-15',
    type: 'custom-combo',
    orderType: 'express',
    categoryId: 'arma-tu-combo',
    name: 'Arma tu combo · 15 piezas',
    description: 'Elegí hasta 3 sabores.',
    price: 18900,
    imageUrl: '/images/menu/arma-tu-combo.jpg',
    pieces: 15,
    maxFlavors: 3,
    available: true,
  },
  {
    id: 'custom-30',
    type: 'custom-combo',
    orderType: 'express',
    categoryId: 'arma-tu-combo',
    name: 'Arma tu combo · 30 piezas',
    description: 'Elegí hasta 5 sabores.',
    price: 34900,
    imageUrl: '/images/menu/arma-tu-combo.jpg',
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

/** Available "Arma tu combo" sizes */
export const getCustomCombos = (date: Date = new Date()): CustomComboProduct[] =>
  PRODUCTS.filter((p): p is CustomComboProduct => p.type === 'custom-combo' && isAvailableOn(p, date));

/** True if any product in the category depends on the weekday (its contents vary by day) */
export const hasDayRestrictions = (categoryId: CategoryId): boolean =>
  PRODUCTS.some((p) => p.categoryId === categoryId && p.availableDays !== undefined);
