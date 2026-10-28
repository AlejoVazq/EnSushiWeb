import { toPersistedLine } from '@/lib/cartItems';
import type { CheckoutForm } from '@/lib/checkout';
import { getSimulatedNow } from '@/lib/schedule';
import type { CartItem, DiscountCode } from '@/types';
import type { CustomerOrder } from '@/types/pedidos';

/**
 * Orders go to the shop's desktop app (through this site's server) instead of WhatsApp.
 * Needs the server with PEDIDOS_POR_APP=1 and this flag at build time; without them the site works as before.
 */
export const ORDERS_BY_APP = process.env.NEXT_PUBLIC_PEDIDOS_POR_APP === '1';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

const request = async <T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
    const data: unknown = await response.json().catch(() => null);
    if (response.ok) return { ok: true, data: data as T };
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Algo salió mal. Probá de nuevo.';
    return { ok: false, status: response.status, error: message };
  } catch {
    return { ok: false, status: 0, error: 'No hay conexión. Revisá internet y probá de nuevo.' };
  }
};

export const getAccount = () => request<{ email: string }>('GET', '/api/cuenta');
export const requestCode = (email: string) => request<{ ok: true }>('POST', '/api/cuenta/codigo', { email });
export const verifyCode = (email: string, code: string) => request<{ email: string }>('POST', '/api/cuenta/verificar', { email, code });
export const logOut = () => request<{ ok: true }>('POST', '/api/cuenta/salir');
export const getOrder = (id: string) => request<CustomerOrder>('GET', `/api/pedidos/${encodeURIComponent(id)}`);

/** Whether a typed code works (the shop's app manages codes in the server's database); answers with its definition */
export const checkDiscountCode = (code: string) =>
  request<{ code: string; definition: DiscountCode }>('POST', '/api/descuentos', {
    codigo: code,
    ...(getSimulatedNow() && { ahora: getSimulatedNow()?.toISOString() }),
  });

/** Sends the cart as menu references: the server prices everything again */
export const sendOrder = (form: CheckoutForm, phone: string, items: readonly CartItem[]) =>
  request<{ id: string }>('POST', '/api/pedidos', {
    ...form,
    phone,
    items: items.map(toPersistedLine),
    // Development only (the server ignores it in production): judge the same simulated hour as the page
    ...(getSimulatedNow() && { ahora: getSimulatedNow()?.toISOString() }),
  });

/** The phone is remembered on this device for the next order */
const PHONE_KEY = 'ensushi-celular';

export const loadSavedPhone = (): string => {
  try {
    return window.localStorage.getItem(PHONE_KEY) ?? '';
  } catch {
    return '';
  }
};

export const savePhone = (phone: string): void => {
  try {
    window.localStorage.setItem(PHONE_KEY, phone);
  } catch {
    // Retyping it next time is the only cost
  }
};
