import type { Category, CategoryId, CustomComboProduct, Product, RollFlavor } from '@/types';

/**
 * Single source of truth for the catalog.
 * Prices are placeholders in ARS — adjust to the real menu.
 */

// ─── Categories (display order) ─────────────────────────────────────────────

export const CATEGORIES: readonly Category[] = [
  { id: 'menu-del-dia', name: 'Menú del día', description: 'Lo que preparó el chef hoy, por tiempo limitado.' },
  { id: 'combos', name: 'Combos', description: 'Selecciones de la casa para compartir.' },
  { id: 'sushiburs', name: 'Sushiburs', description: 'Nuestra fusión: arroz crocante en formato burger.' },
  { id: 'acompanamientos', name: 'Acompañamientos', description: 'Para completar el pedido.' },
  { id: 'arma-tu-combo', name: 'Arma tu combo', description: 'Elegí el tamaño y tus sabores favoritos.' },
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

export const PRODUCTS: readonly Product[] = [
  // Menú del día
  {
    id: 'mdd-poke-salmon',
    type: 'standard',
    categoryId: 'menu-del-dia',
    name: 'Poke de salmón',
    description: 'Arroz de sushi, salmón marinado, palta, edamame, mango y sésamo.',
    price: 11500,
    imageUrl: '/images/menu/poke-salmon.jpg',
    tags: ['nuevo'],
    available: true,
    availableDays: [2, 3, 4], // martes a jueves
  },
  {
    id: 'mdd-roll-del-chef',
    type: 'standard',
    categoryId: 'menu-del-dia',
    name: 'Roll del chef (10 piezas)',
    description: 'Roll de salmón flambeado con salsa de maracuyá y crocante de batata.',
    price: 9800,
    imageUrl: '/images/menu/roll-del-chef.jpg',
    pieces: 10,
    available: true,
    availableDays: [5, 6, 0], // viernes a domingo
  },

  // Combos
  {
    id: 'combo-15',
    type: 'standard',
    categoryId: 'combos',
    name: 'Combo 15 piezas',
    description: '5 Philadelphia, 5 New York y 5 Tempura Roll.',
    price: 17900,
    imageUrl: '/images/menu/combo-15.jpg',
    pieces: 15,
    tags: ['mas-pedido'],
    available: true,
  },
  {
    id: 'combo-30',
    type: 'standard',
    categoryId: 'combos',
    name: 'Combo 30 piezas',
    description: 'Philadelphia, New York, Tempura, Acevichado y Salmon Skin.',
    price: 32500,
    imageUrl: '/images/menu/combo-30.jpg',
    pieces: 30,
    available: true,
  },
  {
    id: 'combo-veggie-20',
    type: 'standard',
    categoryId: 'combos',
    name: 'Combo Veggie 20 piezas',
    description: 'Veggie Roll, roll de palta y hongos, y hosomakis de pepino.',
    price: 21000,
    imageUrl: '/images/menu/combo-veggie.jpg',
    pieces: 20,
    tags: ['veggie'],
    available: true,
  },

  // Sushiburs
  {
    id: 'sb-langostinos',
    type: 'standard',
    categoryId: 'sushiburs',
    name: 'Sushibur de langostinos',
    description: 'Langostinos entre panes de arroz.',
    price: 14500,
    imageUrl: '/images/menu/sushibur-langostinos.jpg',
    available: true,
  },
  {
    id: 'sb-salmon',
    type: 'standard',
    categoryId: 'sushiburs',
    name: 'Sushibur de salmón',
    description: 'Salmón fresco entre panes de arroz.',
    price: 13900,
    imageUrl: '/images/menu/sushibur-salmon.jpg',
    available: true,
  },
  {
    id: 'sb-salmon-cocido',
    type: 'standard',
    categoryId: 'sushiburs',
    name: 'Sushibur de salmón cocido',
    description: 'Salmón cocido entre panes de arroz.',
    price: 13900,
    imageUrl: '/images/menu/sushibur-salmon-cocido.jpg',
    available: true,
  },

  // Acompañamientos
  {
    id: 'acomp-gyozas',
    type: 'standard',
    categoryId: 'acompanamientos',
    name: 'Gyozas de cerdo (6)',
    description: 'Selladas a la plancha, con salsa ponzu.',
    price: 6900,
    imageUrl: '/images/menu/gyozas.jpg',
    pieces: 6,
    available: true,
  },
  {
    id: 'acomp-edamame',
    type: 'standard',
    categoryId: 'acompanamientos',
    name: 'Edamame',
    description: 'Con sal marina en escamas.',
    price: 4500,
    imageUrl: '/images/menu/edamame.jpg',
    tags: ['veggie', 'sin-tacc'],
    available: true,
  },
  {
    id: 'acomp-papas-batata',
    type: 'standard',
    categoryId: 'acompanamientos',
    name: 'Papas de batata',
    description: 'Bastones de batata crocantes con mayo de wasabi.',
    price: 5200,
    imageUrl: '/images/menu/papas-batata.jpg',
    tags: ['veggie'],
    available: true,
  },
  // Salsas: one product each, so the order says exactly which one
  {
    id: 'salsa-soja',
    type: 'standard',
    categoryId: 'acompanamientos',
    name: 'Salsa de soja',
    description: 'Porción extra.',
    price: 900,
    available: true,
  },
  {
    id: 'salsa-buenos-aires',
    type: 'standard',
    categoryId: 'acompanamientos',
    name: 'Salsa Buenos Aires',
    description: 'Salsa especial de la casa. Porción extra.',
    price: 900,
    available: true,
  },
  {
    id: 'salsa-teriyaki',
    type: 'standard',
    categoryId: 'acompanamientos',
    name: 'Salsa teriyaki',
    description: 'Salsa especial de la casa. Porción extra.',
    price: 900,
    available: true,
  },
  {
    id: 'salsa-agridulce',
    type: 'standard',
    categoryId: 'acompanamientos',
    name: 'Salsa agridulce',
    description: 'Salsa especial de la casa. Porción extra.',
    price: 900,
    available: true,
  },

  // Arma tu combo
  {
    id: 'custom-15',
    type: 'custom-combo',
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
