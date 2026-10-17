import type { DeliveryMethod, PaymentMethod } from '@/types';

/**
 * Business constants. Replace the placeholders before going live.
 */
export const BUSINESS = {
  name: 'EnSushi',
  /** International format, digits only, no "+" (required by wa.me) */
  whatsappNumber: '5492478567168', // +54 2478 567168 (the 9 after 54 is required for Argentine mobiles)
  transfer: {
    /**
     * Alias/CVU are intentionally NOT stored here: anything in this file ships in the
     * site's JS. They're sent by WhatsApp only after the order is confirmed.
     */
    provider: 'Mercado Pago',
  },
  pickup: {
    address: 'Puerto Rico 248',
  },
  locale: 'es-AR',
  currency: 'ARS',
} as const;

/** Labels used both in the UI and in the WhatsApp message */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia / Mercado Pago',
};

/** Labels used both in the UI and in the WhatsApp message */
export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  pickup: 'Retiro en el local',
  delivery: 'Envío a domicilio',
};
