import type { StaffOrder } from '../../../src/types/pedidos';

import { paymentSplit } from './textos';

/** The shop's days, whatever this PC's clock zone */
const SHOP_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/** "2026-10-30": the order's day in the shop's time zone */
export const shopDay = (iso: string): string => new Date(iso).toLocaleDateString('sv-SE', { timeZone: SHOP_TIME_ZONE });

/** Today, "YYYY-MM-DD" in the shop's time zone */
export const today = (): string => shopDay(new Date().toISOString());

/** "2026-10-30" → "30/10/2026" */
export const formatDay = (day: string): string => day.split('-').reverse().join('/');

export interface SalesSummary {
  orders: number;
  total: number;
  cash: number;
  transfer: number;
  /** Mixed payments whose split isn't loaded yet: counted in the total, not in cash or transfer */
  unsplitOrders: number;
  unsplitTotal: number;
  deliveryFees: number;
  discounts: number;
}

export const summarizeSales = (orders: readonly StaffOrder[]): SalesSummary =>
  orders.reduce<SalesSummary>(
    (sum, order) => {
      const split = paymentSplit(order);
      return {
        orders: sum.orders + 1,
        total: sum.total + order.total,
        cash: sum.cash + (split?.cash ?? 0),
        transfer: sum.transfer + (split?.transfer ?? 0),
        unsplitOrders: sum.unsplitOrders + (split ? 0 : 1),
        unsplitTotal: sum.unsplitTotal + (split ? 0 : order.total),
        deliveryFees: sum.deliveryFees + order.deliveryFee,
        discounts: sum.discounts + order.discountAmount,
      };
    },
    { orders: 0, total: 0, cash: 0, transfer: 0, unsplitOrders: 0, unsplitTotal: 0, deliveryFees: 0, discounts: 0 },
  );

/** One summary per day with orders, oldest first */
export const salesByDay = (orders: readonly StaffOrder[]): { day: string; summary: SalesSummary }[] => {
  const days = new Map<string, StaffOrder[]>();
  for (const order of orders) {
    const day = shopDay(order.createdAt);
    days.set(day, [...(days.get(day) ?? []), order]);
  }
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, list]) => ({ day, summary: summarizeSales(list) }));
};

export interface ProductSales {
  /** As on the order: "Combo Kanituna · 25 piezas", "Arma tu combo · Caja chica" */
  name: string;
  quantity: number;
  /** Line subtotals, before the order's discount */
  amount: number;
}

/** What sold, most money first */
export const salesByProduct = (orders: readonly StaffOrder[]): ProductSales[] => {
  const products = new Map<string, ProductSales>();
  for (const line of orders.flatMap((order) => order.lines)) {
    const current = products.get(line.name) ?? { name: line.name, quantity: 0, amount: 0 };
    products.set(line.name, { ...current, quantity: current.quantity + line.quantity, amount: current.amount + line.subtotal });
  }
  return [...products.values()].sort((a, b) => b.amount - a.amount || b.quantity - a.quantity);
};
