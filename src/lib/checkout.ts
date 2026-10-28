import { BUSINESS } from '@/config/business';
import { getBestDiscount, lookUpCode } from '@/lib/discounts';
import { getNow } from '@/lib/schedule';
import { cartTotal } from '@/lib/cartItems';
import type { CartItem, DeliveryMethod, DiscountCode, OrderDetails, PaymentMethod } from '@/types';

export interface CheckoutForm {
  name: string;
  deliveryMethod: DeliveryMethod | null;
  /** Only used (and required) for delivery */
  address: string;
  paymentMethod: PaymentMethod | null;
  /** Applied discount code, normalized; '' when none */
  discountCode: string;
}

export type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>>;

export const EMPTY_CHECKOUT_FORM: CheckoutForm = {
  name: '',
  deliveryMethod: null,
  address: '',
  paymentMethod: null,
  discountCode: '',
};

/** The form survives "Editar" / "Volver al menú" for this tab only, and is dropped once the order is sent */
const DRAFT_KEY = 'ensushi-checkout';

const DELIVERY_METHODS: readonly DeliveryMethod[] = ['pickup', 'delivery'];
const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'transfer'];

const pickOne = <T extends string>(options: readonly T[], value: unknown): T | null =>
  options.find((option) => option === value) ?? null;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * The saved draft, or an empty form; anything malformed is ignored. sessionStorage can be missing or throw (SSR, private mode).
 * `keepUnknownCodes`: orders by app, where the server may know codes this file doesn't (the checkout checks them again).
 */
export const loadCheckoutDraft = (keepUnknownCodes = false): CheckoutForm => {
  try {
    const saved: unknown = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) ?? 'null');
    if (!isRecord(saved)) return EMPTY_CHECKOUT_FORM;
    return {
      name: typeof saved.name === 'string' ? saved.name : '',
      deliveryMethod: pickOne(DELIVERY_METHODS, saved.deliveryMethod),
      address: typeof saved.address === 'string' ? saved.address : '',
      paymentMethod: pickOne(PAYMENT_METHODS, saved.paymentMethod),
      // A code that stopped working (expired, removed) since it was saved is dropped
      discountCode:
        typeof saved.discountCode === 'string' && (keepUnknownCodes || lookUpCode(saved.discountCode, getNow()).ok)
          ? saved.discountCode
          : '',
    };
  } catch {
    return EMPTY_CHECKOUT_FORM;
  }
};

export const saveCheckoutDraft = (form: CheckoutForm): void => {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  } catch {
    // Not saving the draft only costs retyping it
  }
};

export const clearCheckoutDraft = (): void => {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear
  }
};

/** Field order, used to focus the first invalid field */
export const CHECKOUT_FIELDS = [
  'name',
  'deliveryMethod',
  'address',
  'paymentMethod',
] as const satisfies readonly (keyof CheckoutForm)[];

export const validateCheckout = (form: CheckoutForm): CheckoutErrors => {
  const errors: CheckoutErrors = {};
  if (form.name.trim().length < 2) errors.name = 'Ingresá tu nombre.';
  if (!form.deliveryMethod) errors.deliveryMethod = 'Elegí si retirás o te lo enviamos.';
  if (form.deliveryMethod === 'delivery' && form.address.trim().length < 5) {
    errors.address = 'Ingresá la dirección de entrega (calle y número).';
  }
  if (!form.paymentMethod) errors.paymentMethod = 'Elegí cómo vas a pagar.';
  return errors;
};

/** Integer ARS; only delivery has a fee */
export const deliveryFeeFor = (method: DeliveryMethod | null): number =>
  method === 'delivery' ? BUSINESS.delivery.fee : 0;

/**
 * Builds the order from a validated form; null if a required choice is missing.
 * Total is always recomputed from the items (minus the discount, plus the delivery fee) at submit time.
 */
export const createOrder = (
  form: CheckoutForm,
  items: readonly CartItem[],
  date: Date,
  /** Codes the server vouched for (see lookUpCode) */
  extraCodes: readonly DiscountCode[] = [],
): OrderDetails | null => {
  if (!form.deliveryMethod || !form.paymentMethod) return null;
  const deliveryFee = deliveryFeeFor(form.deliveryMethod);
  const discount = getBestDiscount(items, { code: form.discountCode, date, extraCodes });
  return {
    customer: { name: form.name.trim() },
    fulfillment:
      form.deliveryMethod === 'delivery'
        ? { method: 'delivery', address: form.address.trim() }
        : { method: 'pickup' },
    paymentMethod: form.paymentMethod,
    items,
    discount,
    deliveryFee,
    total: cartTotal(items) - (discount?.amount ?? 0) + deliveryFee,
  };
};
