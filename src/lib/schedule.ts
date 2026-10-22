import { BUSINESS } from '@/config/business';

export interface ScheduleStatus {
  isOpenToday: boolean;
  /** Today is an opening day and the shop hasn't closed yet: orders for tonight are taken */
  isTakingOrders: boolean;
  /** Express kitchen is taking orders */
  isStoreOpen: boolean;
  /** Today is an opening day and still before its preorder cutoff */
  isPreorderAvailable: boolean;
  /** Past the preorder cutoff (any day): rolls and nigiris of Arma tu combo can't be added */
  isPastPreorderCutoff: boolean;
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

// ─── Simulated clock (development only) ───────────────────────────────────────

/** URL parameter: ?ahora=AAAA-MM-DDTHH:MM (shop time); ?ahora= with no value clears it */
export const SIMULATED_NOW_PARAM = 'ahora';
const SIMULATED_NOW_KEY = 'ensushi:ahora';
const SIMULATED_NOW_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** "AAAA-MM-DDTHH:MM" read as wall-clock time in the shop's time zone → the matching instant; null if invalid */
const parseShopDateTime = (value: string): Date | null => {
  const match = SIMULATED_NOW_PATTERN.exec(value);
  if (!match) return null;
  const [year, month, day, hours, minutes] = match.slice(1).map(Number) as [number, number, number, number, number];
  const wallClock = Date.UTC(year, month - 1, day, hours, minutes);
  // Read that instant back in the shop's zone: the gap is the zone's offset (exact unless it falls on a DST change)
  const shown = shopTime(new Date(wallClock));
  const shownWallClock = Date.parse(`${shown.day}T00:00:00Z`) + shown.minutes * 60_000;
  const date = new Date(wallClock - (shownWallClock - wallClock));
  // Rejects impossible dates such as 2026-02-31
  const check = shopTime(date);
  return check.day === `${match[1]}-${match[2]}-${match[3]}` && check.minutes === hours * 60 + minutes ? date : null;
};

let simulatedNow: Date | null | undefined;

/** Reads ?ahora once per page load and keeps it in sessionStorage so it survives navigation */
const readSimulatedNow = (): Date | null => {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get(SIMULATED_NOW_PARAM);
  try {
    if (fromUrl === '') sessionStorage.removeItem(SIMULATED_NOW_KEY);
    else if (fromUrl !== null) {
      if (parseShopDateTime(fromUrl)) sessionStorage.setItem(SIMULATED_NOW_KEY, fromUrl);
      else console.warn(`[EnSushi] ?${SIMULATED_NOW_PARAM}=${fromUrl} no es AAAA-MM-DDTHH:MM válido; se ignora.`);
    }
    const stored = sessionStorage.getItem(SIMULATED_NOW_KEY);
    return stored ? parseShopDateTime(stored) : null;
  } catch {
    // Storage blocked: honour the URL for this page only
    return fromUrl ? parseShopDateTime(fromUrl) : null;
  }
};

/** The simulated time from ?ahora, or null. Always null in production and on the server. */
export const getSimulatedNow = (): Date | null => {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null;
  if (simulatedNow === undefined) simulatedNow = readSimulatedNow();
  return simulatedNow;
};

/** "Now" for every schedule decision: the simulated time in development, the real clock otherwise */
export const getNow = (): Date => getSimulatedNow() ?? new Date();

/** The calendar day `offset` days after `day`, at UTC noon so weekday math ignores time zones */
const addDays = (day: string, offset: number): Date => new Date(Date.parse(`${day}T12:00:00Z`) + offset * DAY_MS);

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const isOpeningDay = (date: Date): boolean => {
  const day = toIsoDate(date);
  if (closedDates.includes(day)) return false;
  return extraOpenDates.includes(day) || openDays.some((weekday) => weekday === date.getUTCDay());
};

/** Opening and preorder status at `date` (the visitor's clock, read in the shop's time zone) */
export const getScheduleStatus = (date: Date = getNow()): ScheduleStatus => {
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
    isPastPreorderCutoff: minutes >= CUTOFF,
    nextOpening,
  };
};

/** Orders are only for today: closed days and after closing block the checkout; the rest are heads-ups */
export const checkSchedule = (status: ScheduleStatus): CartScheduleCheck => {
  if (!status.isTakingOrders) {
    const reopening = status.nextOpening ? ` Abrimos ${status.nextOpening} a las ${operatingHours.open}.` : '';
    const closed = status.isOpenToday ? 'Ya cerramos por hoy.' : 'Hoy no abrimos.';
    return { canCheckout: false, notices: [{ tone: 'error', message: `${closed}${reopening}` }] };
  }

  const notices: CartScheduleNotice[] = [];
  if (!status.isStoreOpen) {
    notices.push({ tone: 'info', message: `Abrimos hoy a las ${operatingHours.open}.` });
  }
  return { canCheckout: true, notices };
};

/** Heads-ups for the cart: same as the checkout, but nothing blocks there */
export const getCartNotices = (status: ScheduleStatus): CartScheduleNotice[] =>
  checkSchedule(status).notices.map((notice) => ({ ...notice, tone: 'info' }));
