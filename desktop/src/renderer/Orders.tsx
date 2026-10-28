import { useCallback, useEffect, useRef, useState } from 'react';

import type { StaffMenu, StaffOrder } from '../../../src/types/pedidos';
import type { Settings } from '../shared/bridge';
import { DELIVERY_LABELS, formatPrice, formatTime } from '../shared/textos';

import { DiscountCodes } from './DiscountCodes';
import { MenuToday, changeMenu } from './MenuToday';
import { OrderDetail } from './OrderDetail';

/** How often the list asks the server for new orders */
const POLL_MS = 5000;
/** An order waiting this long without an answer beeps again, and again every REMIND_MS, until someone answers it */
const REMIND_AFTER_MS = 3 * 60_000;
const REMIND_MS = 2 * 60_000;

/** "hace 4 min" */
const waitingFor = (createdAt: string, now: number): string => {
  const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000));
  return minutes === 0 ? 'recién' : `hace ${minutes} min`;
};

/** Today's menu changes only come from this app, so it's asked for less often (another PC, or a new day) */
const MENU_POLL_MS = 60_000;

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
  /** A downloaded version waiting to be installed */
  updateVersion: string | null;
}

export function Orders({ settings, onLoggedOut, onSettings, updateVersion }: OrdersProps) {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Codes and today's menu take the order's place on the right; the list keeps polling (and beeping) meanwhile
  const [panel, setPanel] = useState<'pedido' | 'codigos' | 'menu'>('pedido');
  const [menu, setMenu] = useState<StaffMenu | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
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

  const loadMenu = useCallback(async () => {
    const response = await window.ensushi.api('GET', '/api/local/menu');
    if (response.status === 200 && typeof response.data === 'object' && response.data !== null) {
      setMenu(response.data as StaffMenu);
      setMenuError(null);
    } else setMenuError(errorText(response.data));
  }, []);

  useEffect(() => {
    void loadMenu();
    const timer = window.setInterval(() => void loadMenu(), MENU_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadMenu]);

  // Orders nobody answered keep beeping (what to do with them in the end is up to whoever runs the app)
  const ordersRef = useRef(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      const late = ordersRef.current.some(
        (order) => order.status === 'nuevo' && now - new Date(order.createdAt).getTime() > REMIND_AFTER_MS,
      );
      if (late) beep();
    }, REMIND_MS);
    return () => window.clearInterval(timer);
  }, []);

  const resumeOrders = async () => {
    const result = await changeMenu({ ordersPaused: false });
    if (result.ok) setMenu(result.menu);
    else setMenuError(result.error);
  };

  /** After confirming, rejecting or printing: the server's version of the order replaces ours */
  const replaceOrder = (updated: StaffOrder) =>
    setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));

  const pending = orders.filter((order) => order.status === 'nuevo');
  const others = orders.filter((order) => order.status !== 'nuevo');
  const selected = orders.find((order) => order.id === selectedId) ?? null;
  const confirmed = orders.filter((order) => order.status === 'confirmado');
  const confirmedTotal = confirmed.reduce((sum, order) => sum + order.total, 0);
  // The list re-renders with every poll (5 s), enough to keep "hace N min" current
  const now = lastUpdate?.getTime() ?? Date.now();

  const listItem = (order: StaffOrder) => (
    <button
      key={order.id}
      className={`order${order.id === selectedId ? ' selected' : ''}`}
      onClick={() => {
        setSelectedId(order.id);
        setPanel('pedido');
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
        {formatTime(order.createdAt)}
        {order.status === 'nuevo' && <strong className="error"> ({waitingFor(order.createdAt, now)})</strong>} ·{' '}
        {DELIVERY_LABELS[order.deliveryMethod]} · {formatPrice(order.total)}
        {order.eta ? ` · sale ${order.eta}` : ''}
      </div>
    </button>
  );

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="bar" style={{ flexWrap: 'wrap' }}>
          <strong style={{ flex: 1 }}>Pedidos</strong>
          <button className={panel === 'menu' ? 'primary' : undefined} onClick={() => setPanel(panel === 'menu' ? 'pedido' : 'menu')}>
            Menú
          </button>
          <button className={panel === 'codigos' ? 'primary' : undefined} onClick={() => setPanel(panel === 'codigos' ? 'pedido' : 'codigos')}>
            Códigos
          </button>
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
        {updateVersion && (
          <div className="bar" style={{ background: '#e8eefc', fontSize: 14 }}>
            <span style={{ flex: 1 }}>Versión nueva ({updateVersion}). Se instala al cerrar la app.</span>
            <button onClick={() => void window.ensushi.installUpdate()}>Actualizar ahora</button>
          </div>
        )}
        {menu?.ordersPaused && (
          <div className="bar" style={{ background: '#fdecec', fontSize: 14 }}>
            <strong style={{ flex: 1 }} className="error">Pedidos pausados por hoy</strong>
            <button onClick={() => void resumeOrders()}>Reanudar</button>
          </div>
        )}
        <div className="bar muted" style={{ fontSize: 13 }}>
          {connection ? <span className="error">{connection}</span> : lastUpdate ? `Actualizado ${formatTime(lastUpdate)}` : 'Cargando…'}
        </div>
        {confirmed.length > 0 && (
          <div className="bar muted" style={{ fontSize: 13 }}>
            Hoy: {confirmed.length} {confirmed.length === 1 ? 'confirmado' : 'confirmados'} · {formatPrice(confirmedTotal)}
          </div>
        )}
        {pending.length > 0 && <div className="bar"><strong>Por responder ({pending.length})</strong></div>}
        {pending.map(listItem)}
        {others.length > 0 && <div className="bar muted">Respondidos</div>}
        {others.map(listItem)}
        {orders.length === 0 && !connection && <p className="muted" style={{ padding: 12 }}>Todavía no hay pedidos hoy.</p>}
      </aside>

      <main className="main">
        {panel === 'menu' ? (
          <MenuToday menu={menu} loadError={menuError} onChange={setMenu} />
        ) : panel === 'codigos' ? (
          <DiscountCodes />
        ) : selected ? (
          <OrderDetail key={selected.id} order={selected} settings={settings} onUpdated={replaceOrder} />
        ) : (
          <p className="muted">Elegí un pedido de la lista.</p>
        )}
      </main>
    </div>
  );
}
