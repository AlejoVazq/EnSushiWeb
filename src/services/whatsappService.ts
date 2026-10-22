import { BUSINESS, DELIVERY_METHOD_LABELS, PAYMENT_METHOD_LABELS } from '@/config/business';
import { formatBoxContents, getLineName, stepUnits } from '@/lib/cartLine';
import { formatPrice } from '@/lib/format';
import { lineSubtotal } from '@/store/useCartStore';
import type { CartItem, OrderDetails } from '@/types';

/** Intl uses a non-breaking space ("$ 12.900"); WhatsApp gets a plain one */
const price = (amount: number): string => formatPrice(amount).replace(/ /g, ' ');

/** Customer input goes on a single line so it can't break the message layout */
const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * One line per cart line, subtotal last:
 * - "- 2x Combo Kanituna · 24 piezas ($ 72.000)"
 * - "- 1x Arma tu combo · 20 piezas (New York 10, Midori 5, Nigiri de salmón 5) ($ 28.500)"
 * - "- 6x Empanaditas ($ 8.000)": acompañamientos count real units, not steps
 */
const formatLine = (item: CartItem): string => {
  const subtotal = `(${price(lineSubtotal(item))})`;
  switch (item.kind) {
    case 'box':
      return `- ${item.quantity}x ${getLineName(item)} (${formatBoxContents(item.box)}) ${subtotal}`;
    case 'extra':
      return `- ${stepUnits(item.item, item.quantity)}x ${getLineName(item)} ${subtotal}`;
    case 'product':
      return `- ${item.quantity}x ${getLineName(item)} ${subtotal}`;
  }
};

export const buildOrderMessage = (order: OrderDetails): string =>
  [
    '¡Hola! Quiero hacer un pedido:',
    ...order.items.map(formatLine),
    ...(order.deliveryFee > 0 ? [`Envío: ${price(order.deliveryFee)}`] : []),
    `Total: ${price(order.total)}`,
    `Nombre: ${oneLine(order.customer.name)}`,
    `Entrega: ${DELIVERY_METHOD_LABELS[order.fulfillment.method]}`,
    ...(order.fulfillment.method === 'delivery' ? [`Dirección: ${oneLine(order.fulfillment.address)}`] : []),
    `Pago: ${PAYMENT_METHOD_LABELS[order.paymentMethod]}`,
  ].join('\n');

export const buildWhatsAppUrl = (order: OrderDetails): string =>
  `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(buildOrderMessage(order))}`;
