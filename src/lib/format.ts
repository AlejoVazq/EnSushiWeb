import { BUSINESS } from '@/config/business';

const priceFormatter = new Intl.NumberFormat(BUSINESS.locale, {
  style: 'currency',
  currency: BUSINESS.currency,
  maximumFractionDigits: 0,
});

/** Integer ARS → "$ 12.900" */
export const formatPrice = (amount: number): string => priceFormatter.format(amount);

/** A product's price: "$ 500", or "Sin cargo" for free ones (palitos). Totals always use formatPrice. */
export const formatItemPrice = (amount: number): string => (amount === 0 ? 'Sin cargo' : formatPrice(amount));
