import { BUSINESS, DELIVERY_METHOD_LABELS, PAYMENT_METHOD_LABELS } from '@/config/business';
import { getLineFlavorNames } from '@/lib/cartLine';
import { formatPrice } from '@/lib/format';
import { lineSubtotal } from '@/store/useCartStore';
import type { CartItem, OrderDetails } from '@/types';

/** Intl uses a non-breaking space ("$ 12.900"); WhatsApp gets a plain one */
const price = (amount: number): string => formatPrice(amount).replace(/ /g, ' ');

/** Customer input goes on a single line so it can't break the message layout */
const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** "- 2x Combo 15 piezas ($ 35.800)"; custom combos add their flavors before the price */
const formatLine = (item: CartItem): string => {
  const flavors = getLineFlavorNames(item);
  const flavorText = flavors.length > 0 ? ` (${flavors.join(', ')})` : '';
  return `- ${item.quantity}x ${item.product.name}${flavorText} (${price(lineSubtotal(item))})`;
};

export const buildOrderMessage = (order: OrderDetails): string =>
  [
    '¡Hola! Quiero hacer un pedido:',
    ...order.items.map(formatLine),
    `Total: ${price(order.total)}`,
    `Nombre: ${oneLine(order.customer.name)}`,
    `Entrega: ${DELIVERY_METHOD_LABELS[order.fulfillment.method]}`,
    ...(order.fulfillment.method === 'delivery' ? [`Dirección: ${oneLine(order.fulfillment.address)}`] : []),
    `Pago: ${PAYMENT_METHOD_LABELS[order.paymentMethod]}`,
  ].join('\n');

export const buildWhatsAppUrl = (order: OrderDetails): string =>
  `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(buildOrderMessage(order))}`;
