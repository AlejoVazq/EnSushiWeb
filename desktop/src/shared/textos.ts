import type { StaffOrder } from '../../../src/types/pedidos';

import type { Settings } from './bridge';

const SHOP_NAME = 'EnSushi';

/** "$ 23.000" with a plain space (WhatsApp and the printer) */
export const formatPrice = (amount: number): string =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount).replace(/\s/g, ' ');

export const PAYMENT_LABELS: Record<StaffOrder['paymentMethod'], string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  mixed: 'Efectivo y transferencia',
};

/**
 * How much came in cash and how much by transfer; null for a mixed payment whose split the shop hasn't loaded
 * yet (it's settled by WhatsApp)
 */
export const paymentSplit = (order: StaffOrder): { cash: number; transfer: number } | null => {
  switch (order.paymentMethod) {
    case 'cash':
      return { cash: order.total, transfer: 0 };
    case 'transfer':
      return { cash: 0, transfer: order.total };
    case 'mixed':
      return order.cashAmount === null ? null : { cash: order.cashAmount, transfer: order.total - order.cashAmount };
  }
};

export const DELIVERY_LABELS: Record<StaffOrder['deliveryMethod'], string> = {
  pickup: 'Retiro en el local',
  delivery: 'Envío a domicilio',
};

/** "21:07" in the shop's (and this PC's) local time */
export const formatTime = (iso: string | Date): string =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

/** "5492478567168" → "2478567168": area code + number as dialed in Argentina (the area code can be 2 to 4 digits) */
export const formatPhone = (phone: string): string => phone.replace(/^549/, '');

/** `minutes` from now, rounded up to the next 5: the approximate times the shop offers */
export const etaIn = (minutes: number, now = new Date()): string => {
  const date = new Date(now.getTime() + minutes * 60_000);
  const rounded = Math.ceil(date.getMinutes() / 5) * 5;
  date.setMinutes(rounded, 0, 0);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

export const confirmMessage = (order: StaffOrder, eta: string, settings: Settings): string =>
  [
    `¡Hola ${firstName(order.customerName)}! Confirmamos tu pedido #${order.number} de ${SHOP_NAME}.`,
    order.deliveryMethod === 'pickup'
      ? `Lo podés retirar por ${settings.pickupAddress} aprox. a las ${eta}.`
      : `Te lo llevamos a ${order.address ?? 'tu dirección'} aprox. a las ${eta}.`,
    `Total: ${formatPrice(order.total)} (${PAYMENT_LABELS[order.paymentMethod]}).`,
    ...(order.paymentMethod === 'transfer'
      ? [
          settings.transferAlias
            ? `Para pagar, transferí ${formatPrice(order.total)} al alias ${settings.transferAlias} y mandanos el comprobante por acá.`
            : `Para pagar, te pasamos el alias por acá.`,
        ]
      : []),
    ...(order.paymentMethod === 'mixed'
      ? [
          settings.transferAlias
            ? `Contanos cuánto pagás en efectivo; el resto lo transferís al alias ${settings.transferAlias} y nos mandás el comprobante por acá.`
            : `Contanos cuánto pagás en efectivo y te pasamos el alias para el resto.`,
        ]
      : []),
    '¡Gracias!',
  ].join('\n');

export const rejectMessage = (order: StaffOrder, reason: string): string =>
  `¡Hola ${firstName(order.customerName)}! Lamentablemente no podemos tomar tu pedido #${order.number} de ${SHOP_NAME}: ${reason.trim()}. Disculpá las molestias.`;

/** Quick reasons to reject; the text can still be edited */
export const REJECT_REASONS: readonly string[] = [
  'estamos completos por hoy',
  'no llegamos con el envío a esa zona',
  'nos falta algo del pedido',
];

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

/** The comanda for the ticket printer: plain black text, large where the kitchen looks first */
export const comandaHtml = (order: StaffOrder, paperWidth: number): string => {
  const e = escapeHtml;
  // What the TM-T20 actually prints of each paper: 72 mm of the 80, 48 of the 58
  const printableWidth = paperWidth === 58 ? 48 : 72;
  const row = (left: string, right: string) => `<div class="row"><span>${left}</span><span>${right}</span></div>`;
  const lines = order.lines
    .map(
      (line) =>
        `<div class="item"><div class="row"><b>${line.quantity}x ${e(line.name)}</b><span>${formatPrice(line.subtotal)}</span></div>${
          line.detail ? `<div class="detail">${e(line.detail)}</div>` : ''
        }</div>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { margin: 0; }
    * { color: #000 !important; }
    body { box-sizing: border-box; margin: 0; padding: 2mm; width: ${printableWidth}mm; font: 12px/1.35 Arial, sans-serif; }
    h1 { font-size: 20px; margin: 0; }
    .big { font-size: 16px; font-weight: bold; }
    .row { display: flex; justify-content: space-between; gap: 6px; }
    .item { margin: 4px 0; }
    .detail { padding-left: 8px; }
    .notes { border: 2px solid #000; padding: 4px 6px; margin: 6px 0; font-size: 14px; font-weight: bold; }
    hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  </style></head><body>
    <h1>${SHOP_NAME} · #${order.number}</h1>
    <div>${new Date(order.createdAt).toLocaleDateString('es-AR')} ${formatTime(order.createdAt)}</div>
    ${order.eta ? `<div class="big">Sale aprox. ${e(order.eta)}</div>` : ''}
    <hr>
    <div class="big">${e(order.customerName)}</div>
    <div>Tel: ${formatPhone(order.phone)}</div>
    <div class="big">${DELIVERY_LABELS[order.deliveryMethod]}</div>
    ${order.address ? `<div>${e(order.address)}</div>` : ''}
    <div>Pago: ${PAYMENT_LABELS[order.paymentMethod]}</div>
    ${order.notes ? `<div class="notes">Obs.: ${e(order.notes)}</div>` : ''}
    <hr>
    ${lines}
    <hr>
    ${order.discountAmount > 0 || order.deliveryFee > 0 ? row('Subtotal', formatPrice(order.subtotal)) : ''}
    ${order.discountAmount > 0 ? row(`Descuento (${e(order.discountLabel ?? '')})`, `-${formatPrice(order.discountAmount)}`) : ''}
    ${order.deliveryFee > 0 ? row('Envío', formatPrice(order.deliveryFee)) : ''}
    <div class="row big"><span>Total</span><span>${formatPrice(order.total)}</span></div>
  </body></html>`;
};
