import ExcelJS from 'exceljs';

import type { StaffOrder } from '../../src/types/pedidos';

import { DELIVERY_LABELS, formatPhone, formatTime, PAYMENT_LABELS, paymentSplit } from './shared/textos';
import { formatDay, salesByDay, salesByProduct, shopDay, summarizeSales } from './shared/ventas';

const MONEY = '"$" #,##0';
const DATE = 'dd/mm/yyyy';

/** A date cell for the shop's day; Excel stores it as UTC, so it's built at UTC midnight */
const dateCell = (day: string): Date => {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date));
};

interface Column {
  header: string;
  width: number;
  money?: boolean;
  date?: boolean;
}

/** A sheet with a bold, frozen and filterable header row */
const addTable = (book: ExcelJS.Workbook, name: string, columns: readonly Column[], rows: readonly (string | number | Date | null)[][]) => {
  const sheet = book.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({
    header: column.header,
    width: column.width,
    style: column.money ? { numFmt: MONEY } : column.date ? { numFmt: DATE } : {},
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRows(rows.map((row) => [...row]));
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return sheet;
};

/** The sales of a period as an Excel workbook: a summary, every order, every line, and totals per product */
export const salesWorkbook = async (orders: readonly StaffOrder[], from: string, to: string): Promise<Buffer> => {
  const book = new ExcelJS.Workbook();
  book.creator = 'EnSushi Local';

  // ─── Resumen
  const summary = summarizeSales(orders);
  const resumen = book.addWorksheet('Resumen');
  resumen.columns = [{ width: 34 }, { width: 12 }, { width: 16 }, { width: 16 }, { width: 22 }, { width: 16 }];
  resumen.addRow(['Ventas EnSushi']).font = { bold: true, size: 14 };
  resumen.addRow([`Del ${formatDay(from)} al ${formatDay(to)} · solo pedidos confirmados`]);
  resumen.addRow([]);
  const totals: [string, number][] = [
    ['Pedidos confirmados', summary.orders],
    ['Total vendido', summary.total],
    ['En efectivo', summary.cash],
    ['Por transferencia', summary.transfer],
    [`Mixtos sin repartir (${summary.unsplitOrders})`, summary.unsplitTotal],
    ['Envíos cobrados (incluidos en el total)', summary.deliveryFees],
    ['Descuentos hechos', summary.discounts],
  ];
  totals.forEach(([label, value], index) => {
    const row = resumen.addRow([label, value]);
    if (index > 0) row.getCell(2).numFmt = MONEY;
  });
  resumen.getColumn(2).width = 16;
  resumen.addRow([]);
  const header = resumen.addRow(['Fecha', 'Pedidos', 'Efectivo', 'Transferencia', 'Mixto sin repartir', 'Total']);
  header.font = { bold: true };
  for (const { day, summary: daySummary } of salesByDay(orders)) {
    const row = resumen.addRow([
      dateCell(day),
      daySummary.orders,
      daySummary.cash,
      daySummary.transfer,
      daySummary.unsplitTotal,
      daySummary.total,
    ]);
    row.getCell(1).numFmt = DATE;
    [3, 4, 5, 6].forEach((cell) => (row.getCell(cell).numFmt = MONEY));
  }

  // ─── Pedidos: one row per order
  addTable(
    book,
    'Pedidos',
    [
      { header: 'N°', width: 7 },
      { header: 'Fecha', width: 12, date: true },
      { header: 'Hora', width: 7 },
      { header: 'Cliente', width: 22 },
      { header: 'Celular', width: 14 },
      { header: 'Entrega', width: 18 },
      { header: 'Dirección', width: 26 },
      { header: 'Pago', width: 24 },
      { header: 'Efectivo', width: 12, money: true },
      { header: 'Transferencia', width: 14, money: true },
      { header: 'Subtotal', width: 12, money: true },
      { header: 'Descuento', width: 12, money: true },
      { header: 'Motivo del descuento', width: 20 },
      { header: 'Envío', width: 10, money: true },
      { header: 'Total', width: 12, money: true },
      { header: 'Productos', width: 50 },
      { header: 'Observaciones', width: 36 },
    ],
    orders.map((order) => {
      const split = paymentSplit(order);
      return [
        order.number,
        dateCell(shopDay(order.createdAt)),
        formatTime(order.createdAt),
        order.customerName,
        formatPhone(order.phone),
        DELIVERY_LABELS[order.deliveryMethod],
        order.address ?? '',
        split ? PAYMENT_LABELS[order.paymentMethod] : `${PAYMENT_LABELS[order.paymentMethod]} (sin repartir)`,
        split?.cash ?? null,
        split?.transfer ?? null,
        order.subtotal,
        order.discountAmount,
        order.discountLabel ?? '',
        order.deliveryFee,
        order.total,
        order.lines.map((line) => `${line.quantity}x ${line.name}`).join(', '),
        order.notes ?? '',
      ];
    }),
  );

  // ─── Productos vendidos: one row per line of every order
  addTable(
    book,
    'Productos vendidos',
    [
      { header: 'Fecha', width: 12, date: true },
      { header: 'Pedido', width: 8 },
      { header: 'Cantidad', width: 10 },
      { header: 'Producto', width: 36 },
      { header: 'Detalle', width: 40 },
      { header: 'Subtotal', width: 12, money: true },
    ],
    orders.flatMap((order) =>
      order.lines.map((line) => [dateCell(shopDay(order.createdAt)), order.number, line.quantity, line.name, line.detail ?? '', line.subtotal]),
    ),
  );

  // ─── Por producto: totals of the period
  const byProduct = addTable(
    book,
    'Por producto',
    [
      { header: 'Producto', width: 36 },
      { header: 'Cantidad', width: 10 },
      { header: 'Total (antes de descuentos)', width: 26, money: true },
    ],
    salesByProduct(orders).map((product) => [product.name, product.quantity, product.amount]),
  );
  byProduct.getColumn(3).numFmt = MONEY;

  return Buffer.from(await book.xlsx.writeBuffer());
};
