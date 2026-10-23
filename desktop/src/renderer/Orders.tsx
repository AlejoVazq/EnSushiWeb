import { useCallback, useEffect, useRef, useState } from 'react';

import type { StaffOrder } from '../../../src/types/pedidos';
import type { Settings } from '../shared/bridge';
import { DELIVERY_LABELS, formatPrice, formatTime } from '../shared/textos';

import { OrderDetail } from './OrderDetail';

/** How often the list asks the server for new orders */
const POLL_MS = 5000;

/** Two short beeps: a new order came in */
const beep = () => {
  const audio = new AudioContext();
  [0, 0.25].forEach((start) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.connect(gain).connect(audio.destination);
    osc.start(audio.currentTime + start);
    osc.stop(audio.currentTime + start + 0.15);
  });
  window.setTimeout(() => void audio.close(), 1000);
};

const errorText = (data: unknown): string =>
  typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : 'Error del servidor.';

interface OrdersProps {
  settings: Settings;
  onLoggedOut: () => void;
  onSettings: () => void;
}

export function Orders({ settings, onLoggedOut, onSettings }: OrdersProps) {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connection, setConnection] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  // Orders already seen, so only really new ones beep (null until the first load: those don't beep)
  const seen = useRef<Set<string> | null>(null);

  const refresh = useCallback(async () => {
    const response = await window.ensushi.api('GET', '/api/local/pedidos');
    if (response.status === 401) {
      onLoggedOut();
      return;
    }
    if (response.status !== 200 || !Array.isArray(response.data)) {
      setConnection(errorText(response.data));
      return;
    }
    const list = response.data as StaffOrder[];
    setConnection(null);
    setLastUpdate(new Date());
    setOrders(list);

    const fresh = list.filter((order) => order.status === 'nuevo' && !seen.current?.has(order.id));
    if (seen.current && fresh.length > 0) {
      beep();
      document.title = `(${fresh.length}) Pedido nuevo · EnSushi Local`;
    }
    seen.current = new Set(list.map((order) => order.id));
  }, [onLoggedOut]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  /** After confirming, rejecting or printing: the server's version of the order replaces ours */
  const replaceOrder = (updated: StaffOrder) =>
    setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));

  const pending = orders.filter((order) => order.status === 'nuevo');
  const others = orders.filter((order) => order.status !== 'nuevo');
  const selected = orders.find((order) => order.id === selectedId) ?? null;

  const listItem = (order: StaffOrder) => (
    <button
      key={order.id}
      className={`order${order.id === selectedId ? ' selected' : ''}`}
      onClick={() => {
        setSelectedId(order.id);
        document.title = 'EnSushi Local';
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>
          #{order.number} · {order.customerName}
        </strong>
        <span className={`tag ${order.status}`}>{order.status}</span>
      </div>
      <div className="muted">
        {formatTime(order.createdAt)} · {DELIVERY_LABELS[order.deliveryMethod]} · {formatPrice(order.total)}
        {order.eta ? ` · sale ${order.eta}` : ''}
      </div>
    </button>
  );

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="bar">
          <strong style={{ flex: 1 }}>Pedidos</strong>
          <button onClick={onSettings}>Ajustes</button>
          <button
            onClick={async () => {
              await window.ensushi.logout();
              onLoggedOut();
            }}
          >
            Salir
          </button>
        </div>
        <div className="bar muted" style={{ fontSize: 13 }}>
          {connection ? <span className="error">{connection}</span> : lastUpdate ? `Actualizado ${formatTime(lastUpdate)}` : 'Cargando…'}
        </div>
        {pending.length > 0 && <div className="bar"><strong>Por responder ({pending.length})</strong></div>}
        {pending.map(listItem)}
        {others.length > 0 && <div className="bar muted">Respondidos</div>}
        {others.map(listItem)}
        {orders.length === 0 && !connection && <p className="muted" style={{ padding: 12 }}>Todavía no hay pedidos hoy.</p>}
      </aside>

      <main className="main">
        {selected ? (
          <OrderDetail key={selected.id} order={selected} settings={settings} onUpdated={replaceOrder} />
        ) : (
          <p className="muted">Elegí un pedido de la lista.</p>
        )}
      </main>
    </div>
  );
}
