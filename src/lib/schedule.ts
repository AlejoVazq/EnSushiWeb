import { BUSINESS } from '@/config/business';
import type { CartItem } from '@/types';

export interface ScheduleStatus {
  /** Express kitchen is taking orders */
  isStoreOpen: boolean;
  /** Still before today's preorder cutoff */
  isPreorderAvailable: boolean;
}

export interface CartScheduleNotice {
  /** error blocks the checkout; info is just a heads-up */
  tone: 'error' | 'info';
  message: string;
}

export interface CartScheduleCheck {
  canCheckout: boolean;
  notices: CartScheduleNotice[];
}

const { timeZone, operatingHours, preorderCutoff } = BUSINESS.schedule;

/** "HH:MM" → minutes since midnight */
const toMinutes = (time: string): number => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const OPEN = toMinutes(operatingHours.open);
const CLOSE = toMinutes(operatingHours.close);
const CUTOFF = toMinutes(preorderCutoff);

const clockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Minutes since midnight in the shop's time zone, whatever the visitor's zone is */
const shopMinutes = (date: Date): number => {
  const parts = clockFormatter.formatToParts(date);
  const part = (type: 'hour' | 'minute') => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return part('hour') * 60 + part('minute');
};

/** Opening and preorder status at `date` (the visitor's clock, read in the shop's time zone) */
export const getScheduleStatus = (date: Date = new Date()): ScheduleStatus => {
  const now = shopMinutes(date);
  // When closing time is past midnight (e.g. 20:00–00:00) the open window wraps around
  const isStoreOpen = OPEN < CLOSE ? now >= OPEN && now < CLOSE : now >= OPEN || now < CLOSE;
  return { isStoreOpen, isPreorderAvailable: now < CUTOFF };
};

/** Late preorders block the checkout; express items while closed only get a notice */
export const checkCartSchedule = (items: readonly CartItem[], status: ScheduleStatus): CartScheduleCheck => {
  const notices: CartScheduleNotice[] = [];
  const hasPreorder = items.some((item) => item.product.orderType === 'preorder');
  const hasExpress = items.some((item) => item.product.orderType === 'express');

  const preorderClosed = hasPreorder && !status.isPreorderAvailable;
  if (preorderClosed) {
    notices.push({
      tone: 'error',
      message: `El horario para encargar combos de autor finalizó a las ${preorderCutoff}. Sacalos del pedido para continuar.`,
    });
  }
  if (hasExpress && !status.isStoreOpen) {
    notices.push({ tone: 'info', message: `El local abrirá a las ${operatingHours.open}.` });
  }

  return { canCheckout: !preorderClosed, notices };
};
