import { BUSINESS } from '@/config/business';
import {
  BUILD_BOX_SIZES,
  BUILD_CATEGORY_ID,
  CATEGORIES,
  EXTRAS_CATEGORY_ID,
  MENU_CATEGORIES,
  getBuildItemsByGroup,
  getProductsByCategory,
} from '@/data/menu';
import { describeCombinations } from '@/lib/boxRules';
import { cartTotal } from '@/lib/cartItems';
import { formatUnits } from '@/lib/cartLine';
import { createOrder, NOTES_MAX_LENGTH, validateCheckout, type CheckoutForm } from '@/lib/checkout';
import { lookUpCode } from '@/lib/discounts';
import { normalizePhone } from '@/lib/phone';
import { getScheduleStatus } from '@/lib/schedule';
import type { DiscountCode, OrderDetails, Product } from '@/types';
import type { OrderQuote, StaffBoxItem, StaffCatalog, StaffCatalogChoice, StaffCatalogItem, StaffOrder } from '@/types/pedidos';

import { checkServerCode } from './discounts';
import { getLiveMenu } from './liveMenu';
import { insertOrder, readItems, soldOutError, toStaffOrder, usedCodeOf } from './orders';

/**
 * Orders the shop loads by hand from its app, for customers who order by WhatsApp. They have no account and skip
 * what protects the web from strangers (schedule, pause, pending limit): whoever takes the order decides. Prices,
 * discounts and the total are still computed here, the same way as on the web.
 */

type Failure = { ok: false; status: number; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.slice(0, max) : '');

const productChoices = (product: Product): StaffCatalogChoice[] => {
  if (product.type === 'sized') {
    return product.variants.map((variant) => ({
      label: `${variant.pieces} piezas`,
      price: variant.price,
      line: { kind: 'product', productId: product.id, pieces: variant.pieces },
    }));
  }
  if (product.option) {
    return product.option.values.map((value) => ({
      label: value.label,
      price: product.price,
      line: { kind: 'product', productId: product.id, optionId: value.id },
    }));
  }
  return [{ label: null, price: product.price, line: { kind: 'product', productId: product.id } }];
};

/** GET /api/local/catalogo */
export const getStaffCatalog = async (date: Date): Promise<StaffCatalog> => {
  const live = await getLiveMenu(date);
  const isSoldOut = (id: string) => live.soldOut.includes(id);

  const groups = MENU_CATEGORIES.filter((category) => category.id !== BUILD_CATEGORY_ID).map((category) => ({
    name: category.name,
    items:
      category.id === EXTRAS_CATEGORY_ID
        ? getBuildItemsByGroup('acompanamientos')
            .filter((item) => item.available)
            .map(
              (item): StaffCatalogItem => ({
                id: item.id,
                name: item.name,
                soldOut: isSoldOut(item.id),
                choices: [{ label: formatUnits(item.step, item.unitLabel), price: item.price, line: { kind: 'extra', itemId: item.id } }],
              }),
            )
        : getProductsByCategory(category.id, date).map(
            (product): StaffCatalogItem => ({
              id: product.id,
              name: product.name,
              soldOut: isSoldOut(product.id),
              choices: productChoices(product),
            }),
          ),
  }));

  const boxItems = (group: StaffBoxItem['group']): StaffBoxItem[] =>
    getBuildItemsByGroup(group)
      .filter((item) => item.available)
      .map((item) => ({ id: item.id, name: item.name, group, step: item.step, price: item.price, soldOut: isSoldOut(item.id) }));

  return {
    groups,
    box: {
      name: CATEGORIES.find((category) => category.id === BUILD_CATEGORY_ID)?.name ?? 'Arma tu combo',
      sizes: BUILD_BOX_SIZES.map((size) => ({
        id: size.id,
        name: size.name,
        combinations: size.combinations.map((combination) => ({ rollPieces: combination.rollPieces, nigiris: { ...combination.nigiris } })),
        fits: describeCombinations(size),
      })),
      items: [...boxItems('rolls'), ...boxItems('nigiris')],
    },
    cutoffPassed: getScheduleStatus(date).isPastPreorderCutoff ? BUSINESS.schedule.preorderCutoff : null,
  };
};

/** The lines and the code against the menu and today's marks, into the order `form` describes */
const priceOrder = async (body: Record<string, unknown>, form: CheckoutForm, date: Date): Promise<{ ok: true; order: OrderDetails } | Failure> => {
  if (!Array.isArray(body.items)) return { ok: false, status: 400, error: 'Pedido inválido.' };
  const read = readItems(body.items);
  if (!read) return { ok: false, status: 409, error: 'Algo del pedido ya no está en el menú. Sacalo y volvé a sumarlo.' };

  const live = await getLiveMenu(date);
  const soldOut = soldOutError(read.items, live.soldOut, 'pedido');
  if (soldOut) return { ok: false, status: 409, error: soldOut };

  let extraCodes: DiscountCode[] = [];
  if (form.discountCode) {
    const check = await checkServerCode(form.discountCode, null);
    if (check && !check.ok) return { ok: false, status: 409, error: check.error };
    if (check?.ok) extraCodes = [check.definition];
    const lookup = lookUpCode(form.discountCode, date, extraCodes);
    if (!lookup.ok) return { ok: false, status: 400, error: lookup.error };
  }

  const order = createOrder(form, read.items, date, extraCodes);
  return order ? { ok: true, order } : { ok: false, status: 400, error: 'Pedido inválido.' };
};

export type QuoteResult = { ok: true; quote: OrderQuote } | Failure;

/** POST /api/local/pedidos/presupuesto: what the order would cost as it's being loaded, before the customer's data is in */
export const quoteManualOrder = async (body: unknown, date: Date): Promise<QuoteResult> => {
  if (!isRecord(body)) return { ok: false, status: 400, error: 'Pedido inválido.' };
  const form: CheckoutForm = {
    name: '',
    deliveryMethod: body.deliveryMethod === 'delivery' ? 'delivery' : 'pickup',
    address: '',
    paymentMethod: 'cash',
    notes: '',
    discountCode: text(body.discountCode, 40),
  };
  const priced = await priceOrder(body, form, date);
  if (!priced.ok) return priced;
  const { order } = priced;
  return {
    ok: true,
    quote: {
      subtotal: cartTotal(order.items),
      discountLabel: order.discount?.label ?? null,
      discountAmount: order.discount?.amount ?? 0,
      deliveryFee: order.deliveryFee,
      total: order.total,
    },
  };
};

export type ManualOrderResult = { ok: true; order: StaffOrder } | Failure;

/** POST /api/local/pedidos */
export const createManualOrder = async (body: unknown, date: Date): Promise<ManualOrderResult> => {
  if (!isRecord(body)) return { ok: false, status: 400, error: 'Pedido inválido.' };
  const form: CheckoutForm = {
    name: text(body.name, 60),
    deliveryMethod: body.deliveryMethod === 'pickup' || body.deliveryMethod === 'delivery' ? body.deliveryMethod : null,
    address: text(body.address, 160),
    paymentMethod:
      body.paymentMethod === 'cash' || body.paymentMethod === 'transfer' || body.paymentMethod === 'mixed' ? body.paymentMethod : null,
    notes: text(body.notes, NOTES_MAX_LENGTH),
    discountCode: text(body.discountCode, 40),
  };
  const firstError = Object.values(validateCheckout(form))[0];
  if (firstError) return { ok: false, status: 400, error: firstError };

  const phone = normalizePhone(text(body.phone, 40));
  if (!phone) return { ok: false, status: 400, error: 'Revisá el celular: código de área y número.' };

  const priced = await priceOrder(body, form, date);
  if (!priced.ok) return priced;

  const row = await insertOrder(priced.order, {
    customerId: null,
    phone,
    email: null,
    usedCode: usedCodeOf(priced.order, form.discountCode),
  });
  return { ok: true, order: toStaffOrder(row) };
};
