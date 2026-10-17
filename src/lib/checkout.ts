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

/**
 * Builds the order from a validated form; null if a required choice is missing.
 * Total is always recomputed from the items at submit time.
 */
export const createOrder = (form: CheckoutForm, items: readonly CartItem[]): OrderDetails | null => {
  if (!form.deliveryMethod || !form.paymentMethod) return null;
  return {
    customer: { name: form.name.trim() },
    fulfillment:
      form.deliveryMethod === 'delivery'
        ? { method: 'delivery', address: form.address.trim() }
        : { method: 'pickup' },
    paymentMethod: form.paymentMethod,
    items,
    total: cartTotal(items),
  };
};
