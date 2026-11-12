import { useEffect, useState } from 'react';

import type { StaffOrder } from '../../../src/types/pedidos';
import { formatTime } from '../shared/textos';

import { Icon } from './ui';

// ─── "Salió": kept on this PC only (one PC in the shop; the server doesn't need to know) ─────────────────────

const GONE_KEY = 'ensushi-salieron';
const GONE_KEEP_MS = 24 * 60 * 60_000;

/** Order id → when it went out (ISO) */
export type GoneOrders = Record<string, string>;

export const loadGone = (): GoneOrders => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(GONE_KEY) ?? '{}');
    if (typeof raw !== 'object' || raw === null) return {};
    const cutoff = Date.now() - GONE_KEEP_MS;
    return Object.fromEntries(
      Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && new Date(entry[1]).getTime() > cutoff),
    );
  } catch {
    return {};
  }
};

export const saveGone = (gone: GoneOrders) => {
  try {
    localStorage.setItem(GONE_KEY, JSON.stringify(gone));
  } catch {
    // Not saved: it only lasts until the app closes
  }
};

/** Minutes from now to "21:40" (negative when it's past), around midnight too */
export const minutesUntil = (eta: string, now: Date): number => {
  const [hours = 0, minutes = 0] = eta.split(':').map(Number);
  let diff = hours * 60 + minutes - (now.getHours() * 60 + now.getMinutes());
  if (diff < -720) diff += 1440;
  if (diff > 720) diff -= 1440;
  return diff;
};

const describeUntil = (diff: number): string => {
  if (diff < 0) return `atrasado ${-diff} min`;
  if (diff === 0) return 'ahora';
  return `en ${diff} min`;
};

interface KitchenProps {
  orders: StaffOrder[];
  gone: GoneOrders;
  onGone: (id: string) => void;
  onBack: (id: string) => void;
  onOpen: (id: string) => void;
}

/** Confirmed orders by the time they go out, with how long is left; "Salió" takes them off the board */
export function Kitchen({ orders, gone, onGone, onBack, onOpen }: KitchenProps) {
  const [now, setNow] = useState(() => new Date());
  const [showGone, setShowGone] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const confirmed = orders.filter((order) => order.status === 'confirmado' && order.eta);
  const byTime = (a: StaffOrder, b: StaffOrder) => minutesUntil(a.eta ?? '', now) - minutesUntil(b.eta ?? '', now);
  const pending = confirmed.filter((order) => !gone[order.id]).sort(byTime);
  const done = confirmed.filter((order) => gone[order.id]).sort(byTime);

  const row = (order: StaffOrder, isGone: boolean) => {
    const diff = minutesUntil(order.eta ?? '', now);
    const late = !isGone && diff < 0;
    const goneAt = gone[order.id];
    return (
      <div key={order.id} className={`krow${late ? ' late' : ''}${isGone ? ' gone' : ''}`}>
        <div className="t">
          {order.eta}
          <small className="num">{isGone && goneAt ? `salió ${formatTime(goneAt)}` : describeUntil(diff)}</small>
        </div>
        <div className="items">
          {order.lines.map((line, index) => (
            <span key={index}>
              {line.quantity}× {line.name}
              {line.detail && <small> · {line.detail}</small>}
            </span>
          ))}
          {order.notes && (
            <span className="k-note">
              <Icon name="note" size="sm" />
              {order.notes}
            </span>
          )}
        </div>
        <button className="who" onClick={() => onOpen(order.id)} title="Ver el pedido">
          <b className="num">
            #{order.number} {order.customerName}
          </b>
          <span>
            <Icon name={order.deliveryMethod === 'delivery' ? 'bike' : 'bag'} size="xs" />
            {order.deliveryMethod === 'delivery' ? `Envío · ${order.address ?? ''}` : 'Retiro en el local'}
          </span>
        </button>
        {isGone ? (
          <button className="btn" onClick={() => onBack(order.id)}>
            <Icon name="undo" size="sm" />
            Volver
          </button>
        ) : (
          <button className="btn" onClick={() => onGone(order.id)}>
            <Icon name="check" size="sm" />
            Salió
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="page" style={{ maxWidth: 'none' }}>
      <div className="k-head">
        <h1>En cocina</h1>
        <p className="muted">
          {pending.length === 0 ? 'Nada por salir.' : pending.length === 1 ? '1 pedido por salir' : `${pending.length} pedidos por salir`}
        </p>
        <span className="clock" aria-label="Hora">
          {formatTime(now)}
        </span>
      </div>

      {pending.length > 0 ? (
        <div className="k-list">{pending.map((order) => row(order, false))}</div>
      ) : (
        <p className="muted">Los pedidos aparecen acá cuando los confirmás, ordenados por la hora en que salen.</p>
      )}

      {done.length > 0 && (
        <div className="inline">
          <span className="muted small">
            {done.length === 1 ? 'Ya salió 1 hoy' : `Ya salieron ${done.length} hoy`}
          </span>
          <button className="btn sm" onClick={() => setShowGone((value) => !value)}>
            {showGone ? 'Ocultar' : 'Ver'}
          </button>
        </div>
      )}
      {showGone && done.length > 0 && <div className="k-list">{done.map((order) => row(order, true))}</div>}
    </div>
  );
}
