import { BUSINESS } from '@/config/business';
import { cartTotal } from '@/store/useCartStore';
import type { CartItem, DeliveryMethod, OrderDetails, PaymentMethod } from '@/types';

export interface CheckoutForm {
  name: string;
  /** "YYYY-MM-DD", one of the upcoming opening days */
  orderDate: string | null;
  deliveryMethod: DeliveryMethod | null;
  /** Only used (and required) for delivery */
  address: string;
  paymentMethod: PaymentMethod | null;
}

export type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>>;

/** Field order, used to focus the first invalid field */
export const CHECKOUT_FIELDS = [
  'name',
  'orderDate',
  'deliveryMethod',
  'address',
  'paymentMethod',
] as const satisfies readonly (keyof CheckoutForm)[];

/** `orderDates`: the days that can still be picked (today drops off once the shop closes) */
export const validateCheckout = (form: CheckoutForm, orderDates: readonly string[]): CheckoutErrors => {
  const errors: CheckoutErrors = {};
  if (form.name.trim().length < 2) errors.name = 'Ingresá tu nombre.';
  if (!form.orderDate) errors.orderDate = 'Elegí para qué día es el pedido.';
  else if (!orderDates.includes(form.orderDate)) errors.orderDate = 'Ese día ya no está disponible. Elegí otro.';
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
  if (!form.orderDate || !form.deliveryMethod || !form.paymentMethod) return null;
  const deliveryFee = deliveryFeeFor(form.deliveryMethod);
  return {
    customer: { name: form.name.trim() },
    orderDate: form.orderDate,
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
