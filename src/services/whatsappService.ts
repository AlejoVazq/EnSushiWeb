import { BUSINESS, DELIVERY_METHOD_LABELS, PAYMENT_METHOD_LABELS } from '@/config/business';
import { getLineFlavorNames, getLineName } from '@/lib/cartLine';
import { formatPrice } from '@/lib/format';
import { formatOrderDate } from '@/lib/schedule';
import { lineSubtotal } from '@/store/useCartStore';
import type { CartItem, OrderDetails } from '@/types';

/** Intl uses a non-breaking space ("$ 12.900"); WhatsApp gets a plain one */
const price = (amount: number): string => formatPrice(amount).replace(/ /g, ' ');

/** Customer input goes on a single line so it can't break the message layout */
const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** "- 2x Combo Kanituna · 24 piezas ($ 72.000)"; custom combos add their flavors before the price */
const formatLine = (item: CartItem): string => {
  const flavors = getLineFlavorNames(item);
  const flavorText = flavors.length > 0 ? ` (${flavors.join(', ')})` : '';
  return `- ${item.quantity}x ${getLineName(item)}${flavorText} (${price(lineSubtotal(item))})`;
};

export const buildOrderMessage = (order: OrderDetails): string =>
  [
    '¡Hola! Quiero hacer un pedido:',
    ...order.items.map(formatLine),
    ...(order.deliveryFee > 0 ? [`Envío: ${price(order.deliveryFee)}`] : []),
    `Total: ${price(order.total)}`,
    `Para: ${formatOrderDate(order.orderDate)}`,
    `Nombre: ${oneLine(order.customer.name)}`,
    `Entrega: ${DELIVERY_METHOD_LABELS[order.fulfillment.method]}`,
    ...(order.fulfillment.method === 'delivery' ? [`Dirección: ${oneLine(order.fulfillment.address)}`] : []),
    `Pago: ${PAYMENT_METHOD_LABELS[order.paymentMethod]}`,
  ].join('\n');

export const buildWhatsAppUrl = (order: OrderDetails): string =>
  `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(buildOrderMessage(order))}`;
