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
  delivery: {
    /** Flat fee in ARS, integer, added to the order total */
    fee: 3000,
  },
  /** 24h "HH:MM" times, in the shop's time zone (not the visitor's) */
  schedule: {
    timeZone: 'America/Argentina/Buenos_Aires',
    /** Regular opening days, 0 = Sunday … 6 = Saturday (Friday to Sunday) */
    openDays: [5, 6, 0],
    /** Holidays outside `openDays` the shop works, "YYYY-MM-DD" */
    extraOpenDates: [] as readonly string[],
    /** `openDays` the shop doesn't work (e.g. Christmas), "YYYY-MM-DD" */
    closedDates: [] as readonly string[],
    /** Express kitchen, same day (`close` after `open`) */
    operatingHours: { open: '17:00', close: '23:30' },
    /** Last time to order `preorder` products (Arma tu combo) for the same night */
    preorderCutoff: '20:00',
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
