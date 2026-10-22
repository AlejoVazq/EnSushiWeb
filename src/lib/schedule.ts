import { BUSINESS } from '@/config/business';
import type { CartItem } from '@/types';

export interface ScheduleStatus {
  isOpenToday: boolean;
  /** Today is an opening day and the shop hasn't closed yet: orders for tonight are taken */
  isTakingOrders: boolean;
  /** Express kitchen is taking orders */
  isStoreOpen: boolean;
  /** Today is an opening day and still before its preorder cutoff */
  isPreorderAvailable: boolean;
  /** When the shop opens next: "hoy", "mañana" or "el viernes"; null if no opening day is coming up */
  nextOpening: string | null;
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

const { timeZone, openDays, extraOpenDates, closedDates, operatingHours, preorderCutoff } = BUSINESS.schedule;

/** "HH:MM" → minutes since midnight */
const toMinutes = (time: string): number => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const OPEN = toMinutes(operatingHours.open);
const CLOSE = toMinutes(operatingHours.close);
const CUTOFF = toMinutes(preorderCutoff);

const DAY_MS = 24 * 60 * 60_000;
/** How far ahead to look for the next opening day */
const LOOKAHEAD_DAYS = 14;

const clockFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// Calendar days are UTC-noon dates (see `addDays`), so this reads them in UTC
const weekdayFormatter = new Intl.DateTimeFormat(BUSINESS.locale, { weekday: 'long', timeZone: 'UTC' });

/** Calendar date ("YYYY-MM-DD") and minutes since midnight in the shop's time zone, whatever the visitor's zone is */
const shopTime = (date: Date): { day: string; minutes: number } => {
  const parts = clockFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    day: `${part('year')}-${part('month')}-${part('day')}`,
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
};

/** The calendar day `offset` days after `day`, at UTC noon so weekday math ignores time zones */
const addDays = (day: string, offset: number): Date => new Date(Date.parse(`${day}T12:00:00Z`) + offset * DAY_MS);

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const isOpeningDay = (date: Date): boolean => {
  const day = toIsoDate(date);
  if (closedDates.includes(day)) return false;
  return extraOpenDates.includes(day) || openDays.some((weekday) => weekday === date.getUTCDay());
};

/** Opening and preorder status at `date` (the visitor's clock, read in the shop's time zone) */
export const getScheduleStatus = (date: Date = new Date()): ScheduleStatus => {
  const { day: today, minutes } = shopTime(date);
  const isOpenToday = isOpeningDay(addDays(today, 0));

  let nextOpening: string | null = null;
  for (let offset = 0; offset <= LOOKAHEAD_DAYS && nextOpening === null; offset++) {
    const candidate = addDays(today, offset);
    // Today only "opens next" before opening time
    if (!isOpeningDay(candidate) || (offset === 0 && minutes >= OPEN)) continue;
    nextOpening = offset === 0 ? 'hoy' : offset === 1 ? 'mañana' : `el ${weekdayFormatter.format(candidate)}`;
  }

  return {
    isOpenToday,
    isTakingOrders: isOpenToday && minutes < CLOSE,
    isStoreOpen: isOpenToday && minutes >= OPEN && minutes < CLOSE,
    isPreorderAvailable: isOpenToday && minutes < CUTOFF,
    nextOpening,
  };
};

const hasOrderType = (items: readonly CartItem[], orderType: CartItem['product']['orderType']): boolean =>
  items.some((item) => item.product.orderType === orderType);

/** Orders are only for today: closed days and after closing block the checkout; the rest are heads-ups */
export const checkSchedule = (items: readonly CartItem[], status: ScheduleStatus): CartScheduleCheck => {
  if (!status.isTakingOrders) {
    const reopening = status.nextOpening ? ` Abrimos ${status.nextOpening} a las ${operatingHours.open}.` : '';
    const closed = status.isOpenToday ? 'Ya cerramos por hoy.' : 'Hoy no abrimos.';
    return { canCheckout: false, notices: [{ tone: 'error', message: `${closed}${reopening}` }] };
  }

  const notices: CartScheduleNotice[] = [];
  if (!status.isStoreOpen) {
    notices.push({ tone: 'info', message: `Abrimos hoy a las ${operatingHours.open}.` });
  }
  // The per-item block (rolls and nigiris) lands with the Arma tu combo builder; for now it's only a heads-up
  if (hasOrderType(items, 'preorder') && !status.isPreorderAvailable) {
    notices.push({
      tone: 'info',
      message: `Arma tu combo se pide hasta las ${preorderCutoff}. Te confirmamos por WhatsApp si todavía lo podemos preparar.`,
    });
  }
  return { canCheckout: true, notices };
};

/** Heads-ups for the cart: same as the checkout, but nothing blocks there */
export const getCartNotices = (items: readonly CartItem[], status: ScheduleStatus): CartScheduleNotice[] =>
  checkSchedule(items, status).notices.map((notice) => ({ ...notice, tone: 'info' }));
