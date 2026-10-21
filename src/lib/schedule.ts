import { BUSINESS } from '@/config/business';
import type { CartItem } from '@/types';

/** An opening day the customer can order for */
export interface OrderDay {
  /** "YYYY-MM-DD" in the shop's time zone */
  date: string;
  /** "Hoy · viernes 23/10", "Mañana · sábado 24/10" or "Domingo 25/10" */
  label: string;
}

export interface ScheduleStatus {
  /** Today's date, "YYYY-MM-DD" in the shop's time zone */
  today: string;
  /** Express kitchen is taking orders */
  isStoreOpen: boolean;
  /** Today is an opening day and still before its preorder cutoff */
  isPreorderAvailable: boolean;
  /** When the shop opens next: "hoy", "mañana" or "el viernes"; null if no opening day is coming up */
  nextOpening: string | null;
  /** Upcoming opening days, today included until it closes */
  orderDays: OrderDay[];
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
/** How far ahead customers can order */
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

// Calendar days are UTC-noon dates (see `addDays`), so these read them in UTC
const weekdayFormatter = new Intl.DateTimeFormat(BUSINESS.locale, { weekday: 'long', timeZone: 'UTC' });
const dayMonthFormatter = new Intl.DateTimeFormat(BUSINESS.locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

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

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** "YYYY-MM-DD" → "Sábado 24/10" */
export const formatOrderDate = (day: string): string => {
  const date = addDays(day, 0);
  return capitalize(`${weekdayFormatter.format(date)} ${dayMonthFormatter.format(date)}`);
};

/** Opening and preorder status at `date` (the visitor's clock, read in the shop's time zone) */
export const getScheduleStatus = (date: Date = new Date()): ScheduleStatus => {
  const { day: today, minutes } = shopTime(date);
  const isOpenToday = isOpeningDay(addDays(today, 0));

  const orderDays: OrderDay[] = [];
  let nextOpening: string | null = null;
  for (let offset = 0; offset <= LOOKAHEAD_DAYS; offset++) {
    const candidate = addDays(today, offset);
    if (!isOpeningDay(candidate)) continue;

    const relative = offset === 0 ? 'hoy' : offset === 1 ? 'mañana' : null;
    const dateLabel = formatOrderDate(toIsoDate(candidate));
    // Today can still be ordered for until closing, but it only "opens next" before opening time
    if (offset > 0 || minutes < CLOSE) {
      orderDays.push({
        date: toIsoDate(candidate),
        label: relative ? `${capitalize(relative)} · ${dateLabel.toLowerCase()}` : dateLabel,
      });
    }
    if (nextOpening === null && (offset > 0 || minutes < OPEN)) {
      nextOpening = relative ?? `el ${weekdayFormatter.format(candidate)}`;
    }
  }

  return {
    today,
    isStoreOpen: isOpenToday && minutes >= OPEN && minutes < CLOSE,
    isPreorderAvailable: isOpenToday && minutes < CUTOFF,
    nextOpening,
    orderDays,
  };
};

const hasOrderType = (items: readonly CartItem[], orderType: CartItem['product']['orderType']): boolean =>
  items.some((item) => item.product.orderType === orderType);

/** Heads-ups for the cart, before the customer picks a day; nothing blocks there */
export const getCartNotices = (items: readonly CartItem[], status: ScheduleStatus): CartScheduleNotice[] => {
  const notices: CartScheduleNotice[] = [];
  // Only worth saying while today can still be picked; on other days the next one is the obvious choice
  const canOrderForToday = status.orderDays[0]?.date === status.today;
  if (hasOrderType(items, 'preorder') && canOrderForToday && !status.isPreorderAvailable) {
    notices.push({
      tone: 'info',
      message: `Los combos armados para el mismo día se piden hasta las ${preorderCutoff}. Al finalizar, elegí otro día.`,
    });
  }
  if (hasOrderType(items, 'express') && !status.isStoreOpen && status.nextOpening) {
    notices.push({
      tone: 'info',
      message: `Abrimos ${status.nextOpening} a las ${operatingHours.open}. Podés dejar tu pedido encargado.`,
    });
  }
  return notices;
};

/** Checks the chosen day: same-day preorders past the cutoff block the checkout */
export const checkOrderDay = (
  items: readonly CartItem[],
  status: ScheduleStatus,
  orderDate: string | null,
): CartScheduleCheck => {
  const notices: CartScheduleNotice[] = [];
  if (orderDate !== status.today) return { canCheckout: true, notices };

  const preorderClosed = hasOrderType(items, 'preorder') && !status.isPreorderAvailable;
  if (preorderClosed) {
    notices.push({
      tone: 'error',
      message: `Los combos armados para hoy se pedían hasta las ${preorderCutoff}. Elegí otro día o sacalos del pedido.`,
    });
  }
  if (hasOrderType(items, 'express') && !status.isStoreOpen) {
    notices.push({ tone: 'info', message: `Abrimos hoy a las ${operatingHours.open}.` });
  }
  return { canCheckout: !preorderClosed, notices };
};
