import type { StaffOrder } from '../../../src/types/pedidos';

import { paymentSplit } from './textos';

/**
 * The day's cash drawer, from its opening amount and the day's confirmed orders:
 * - pickups paid in cash go straight into the drawer;
 * - each delivery driver takes some change out (`driverFloat`) and, back from the trip, hands in that change plus
 *   whatever the customer paid in cash, delivery fee included (`driverReturned`).
 */

/** Cash the customer pays for the order; null for a mixed payment whose split isn't loaded yet */
export const cashCollected = (order: StaffOrder): number | null => paymentSplit(order)?.cash ?? null;

/** What the driver has to hand in: the change they took plus the cash they collect; null while a mixed split is missing */
export const driverOwes = (order: StaffOrder): number | null => {
  const cash = cashCollected(order);
  return cash === null ? null : (order.driverFloat ?? 0) + cash;
};

/** Handed in minus owed: negative is missing money, positive is extra; null until they're back (or while it can't be known) */
export const driverDifference = (order: StaffOrder): number | null => {
  const owes = driverOwes(order);
  return owes === null || order.driverReturned === null ? null : order.driverReturned - owes;
};

export interface CashSummary {
  opening: number;
  /** Cash from pickups */
  pickupCash: number;
  /** Change the drivers took out */
  floatsOut: number;
  /** What the drivers handed in */
  handedIn: number;
  /** What should be in the drawer right now */
  expected: number;
  /** Deliveries out (or not handed in yet), and what they still have to bring */
  pendingDeliveries: number;
  pendingOwed: number;
  /** Deliveries nobody was set to take */
  unassigned: number;
  /** Mixed payments without their split: their cash can't be counted yet */
  unsplit: number;
  /** Sum of every handed-in difference (negative = missing) */
  difference: number;
}

export const summarizeCash = (opening: number | null, orders: readonly StaffOrder[]): CashSummary => {
  const summary: CashSummary = {
    opening: opening ?? 0,
    pickupCash: 0,
    floatsOut: 0,
    handedIn: 0,
    expected: 0,
    pendingDeliveries: 0,
    pendingOwed: 0,
    unassigned: 0,
    unsplit: 0,
    difference: 0,
  };
  for (const order of orders) {
    if (order.status !== 'confirmado') continue;
    const cash = cashCollected(order);
    if (cash === null) summary.unsplit += 1;
    if (order.deliveryMethod === 'pickup') {
      summary.pickupCash += cash ?? 0;
      continue;
    }
    if (!order.driver) summary.unassigned += 1;
    summary.floatsOut += order.driverFloat ?? 0;
    if (order.driverReturned === null) {
      if (order.driver) {
        summary.pendingDeliveries += 1;
        summary.pendingOwed += driverOwes(order) ?? 0;
      }
    } else {
      summary.handedIn += order.driverReturned;
      summary.difference += driverDifference(order) ?? 0;
    }
  }
  summary.expected = summary.opening + summary.pickupCash - summary.floatsOut + summary.handedIn;
  return summary;
};

export interface DriverSummary {
  driver: string;
  orders: number;
  floats: number;
  owes: number;
  handedIn: number;
  /** Still out: not handed in yet */
  pending: number;
  /** Over the handed-in ones */
  difference: number;
}

/** One line per driver, in the order they first went out */
export const summarizeDrivers = (orders: readonly StaffOrder[]): DriverSummary[] => {
  const byDriver = new Map<string, DriverSummary>();
  for (const order of orders) {
    if (order.status !== 'confirmado' || order.deliveryMethod !== 'delivery' || !order.driver) continue;
    const line = byDriver.get(order.driver) ?? {
      driver: order.driver,
      orders: 0,
      floats: 0,
      owes: 0,
      handedIn: 0,
      pending: 0,
      difference: 0,
    };
    line.orders += 1;
    line.floats += order.driverFloat ?? 0;
    line.owes += driverOwes(order) ?? 0;
    if (order.driverReturned === null) line.pending += 1;
    else {
      line.handedIn += order.driverReturned;
      line.difference += driverDifference(order) ?? 0;
    }
    byDriver.set(order.driver, line);
  }
  return [...byDriver.values()];
};

/** "+$ 500" / "−$ 1.000" / "Justo" */
export const formatDifference = (difference: number, formatPrice: (amount: number) => string): string =>
  difference === 0 ? 'Justo' : difference > 0 ? `Sobran ${formatPrice(difference)}` : `Faltan ${formatPrice(-difference)}`;
