import { BUSINESS } from '@/config/business';
import { cartTotal } from '@/store/useCartStore';
import type { CartItem, DeliveryMethod, OrderDetails, PaymentMethod } from '@/types';

export interface CheckoutForm {
  name: string;
  deliveryMethod: DeliveryMethod | null;
  /** Only used (and required) for delivery */
  address: string;
  paymentMethod: PaymentMethod | null;
}

export type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>>;

export const EMPTY_CHECKOUT_FORM: CheckoutForm = {
  name: '',
  deliveryMethod: null,
  address: '',
  paymentMethod: null,
};

/** The form survives "Editar" / "Volver al menú" for this tab only, and is dropped once the order is sent */
const DRAFT_KEY = 'ensushi-checkout';

const DELIVERY_METHODS: readonly DeliveryMethod[] = ['pickup', 'delivery'];
const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'transfer'];

const pickOne = <T extends string>(options: readonly T[], value: unknown): T | null =>
  options.find((option) => option === value) ?? null;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** The saved draft, or an empty form; anything malformed is ignored. sessionStorage can be missing or throw (SSR, private mode). */
export const loadCheckoutDraft = (): CheckoutForm => {
  try {
    const saved: unknown = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) ?? 'null');
    if (!isRecord(saved)) return EMPTY_CHECKOUT_FORM;
    return {
      name: typeof saved.name === 'string' ? saved.name : '',
      deliveryMethod: pickOne(DELIVERY_METHODS, saved.deliveryMethod),
      address: typeof saved.address === 'string' ? saved.address : '',
      paymentMethod: pickOne(PAYMENT_METHODS, saved.paymentMethod),
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
 * Total is always recomputed from the items (plus the delivery fee) at submit time.
 */
export const createOrder = (form: CheckoutForm, items: readonly CartItem[]): OrderDetails | null => {
  if (!form.deliveryMethod || !form.paymentMethod) return null;
  const deliveryFee = deliveryFeeFor(form.deliveryMethod);
  return {
    customer: { name: form.name.trim() },
    fulfillment:
      form.deliveryMethod === 'delivery'
        ? { method: 'delivery', address: form.address.trim() }
        : { method: 'pickup' },
    paymentMethod: form.paymentMethod,
    items,
    deliveryFee,
    total: cartTotal(items) + deliveryFee,
  };
};
