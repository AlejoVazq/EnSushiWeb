import { useCallback, useEffect, useRef, useState } from 'react';

import type { StaffMenu, StaffOrder } from '../../../src/types/pedidos';
import type { Settings } from '../shared/bridge';
import { formatPrice, formatTime } from '../shared/textos';

import { DiscountCodes } from './DiscountCodes';
import { Kitchen, loadGone, saveGone, type GoneOrders } from './Kitchen';
import { MenuToday, changeMenu } from './MenuToday';
import { NewOrder } from './NewOrder';
import { isLate, LATE_AFTER_MS, OrderDetail, waitingFor } from './OrderDetail';
import { Sales } from './Sales';
import { SettingsPanel } from './SettingsPanel';
import { Icon, isTyping, type IconName } from './ui';

/** How often the list asks the server for new orders */
const POLL_MS = 5000;
/** An order waiting more than LATE_AFTER_MS beeps again every REMIND_MS, until someone answers it */
const REMIND_MS = 2 * 60_000;

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

type Panel = 'pedidos' | 'cocina' | 'nuevo' | 'menu' | 'codigos' | 'ventas' | 'ajustes';

const NAV: readonly { panel: Panel; label: string; icon: IconName }[] = [
  { panel: 'pedidos', label: 'Pedidos', icon: 'inbox' },
  { panel: 'cocina', label: 'En cocina', icon: 'pot' },
  { panel: 'nuevo', label: 'Nuevo pedido', icon: 'plus' },
  { panel: 'menu', label: 'Menú de hoy', icon: 'utensils' },
  { panel: 'codigos', label: 'Códigos', icon: 'tag' },
  { panel: 'ventas', label: 'Ventas', icon: 'chart' },
  { panel: 'ajustes', label: 'Ajustes', icon: 'sliders' },
];

interface OrdersProps {
  settings: Settings;
  onSettingsSaved: (settings: Settings) => void;
  onLoggedOut: () => void;
  /** A downloaded version waiting to be installed */
  updateVersion: string | null;
}

/** The app once logged in: the rail on the left, and the screen on the right. The list keeps polling (and beeping) on every screen. */
export function Orders({ settings, onSettingsSaved, onLoggedOut, updateVersion }: OrdersProps) {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('pedidos');
  // Changing it starts the new order over
  const [newOrderKey, setNewOrderKey] = useState(0);
  const [menu, setMenu] = useState<StaffMenu | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [connection, setConnection] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [gone, setGone] = useState<GoneOrders>(loadGone);
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

    // The ones loaded by hand were just loaded here: nobody needs a beep for them
    const fresh = list.filter((order) => order.status === 'nuevo' && !order.manual && !seen.current?.has(order.id));
    if (seen.current && fresh.length > 0) {
      beep();
      document.title = `(${fresh.length}) Pedido nuevo · EnSushi Local`;
      const [first] = fresh;
      void window.ensushi.notifyNewOrders(
        fresh.length === 1 && first ? `Pedido nuevo #${first.number}` : `${fresh.length} pedidos nuevos`,
        fresh.map((order) => `${order.customerName} · ${formatPrice(order.total)}`).join('\n'),
      );
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
        (order) => order.status === 'nuevo' && now - new Date(order.createdAt).getTime() > LATE_AFTER_MS,
      );
      if (late) beep();
    }, REMIND_MS);
    return () => window.clearInterval(timer);
  }, []);

  const updateGone = (change: (prev: GoneOrders) => GoneOrders) =>
    setGone((prev) => {
      const next = change(prev);
      saveGone(next);
      return next;
    });

  const resumeOrders = async () => {
    const result = await changeMenu({ ordersPaused: false });
    if (result.ok) setMenu(result.menu);
    else setMenuError(result.error);
  };

  /** After confirming, rejecting or printing: the server's version of the order replaces ours */
  const replaceOrder = (updated: StaffOrder) =>
    setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));

  const openOrder = (id: string) => {
    setSelectedId(id);
    setPanel('pedidos');
    document.title = 'EnSushi Local';
  };

  /** A new order was saved: on to giving it a time, like any other */
  const orderCreated = (created: StaffOrder) => {
    setOrders((prev) => [created, ...prev]);
    openOrder(created.id);
    setNewOrderKey((key) => key + 1);
  };

  const pending = orders.filter((order) => order.status === 'nuevo');
  const others = orders.filter((order) => order.status !== 'nuevo');
  const sequence = [...pending, ...others];
  const selected = orders.find((order) => order.id === selectedId) ?? null;
  const confirmed = orders.filter((order) => order.status === 'confirmado');
  const confirmedTotal = confirmed.reduce((sum, order) => sum + order.total, 0);
  const inKitchen = confirmed.filter((order) => !gone[order.id]).length;
  // The list re-renders with every poll (5 s), enough to keep "hace N min" current
  const now = lastUpdate?.getTime() ?? Date.now();
  const oldestPending = pending.reduce<StaffOrder | null>(
    (oldest, order) => (!oldest || order.createdAt < oldest.createdAt ? order : oldest),
    null,
  );

  // ↑ ↓ move through the list (pending first, as shown)
  useEffect(() => {
    if (panel !== 'pedidos') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (event.ctrlKey || event.altKey || event.metaKey || isTyping(event.target)) return;
      if (sequence.length === 0) return;
      event.preventDefault();
      const index = sequence.findIndex((order) => order.id === selectedId);
      const nextIndex =
        index === -1 ? 0 : Math.min(sequence.length - 1, Math.max(0, index + (event.key === 'ArrowDown' ? 1 : -1)));
      const next = sequence[nextIndex];
      if (!next) return;
      setSelectedId(next.id);
      document.title = 'EnSushi Local';
      document.querySelector(`[data-order="${next.id}"]`)?.scrollIntoView({ block: 'nearest' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const listItem = (order: StaffOrder) => {
    const goneAt = gone[order.id];
    return (
      <button
        key={order.id}
        data-order={order.id}
        className={`order ${order.status}`}
        aria-current={order.id === selectedId}
        onClick={() => openOrder(order.id)}
      >
        <span className="n">#{order.number}</span>
        <span className="who">{order.customerName}</span>
        {order.status === 'nuevo' ? (
          <span className={isLate(order, now) ? 'wait late' : 'wait'}>{waitingFor(order.createdAt, now)}</span>
        ) : order.status === 'confirmado' ? (
          <span className="tag confirmado">
            <Icon name="check" size="xs" />
            {goneAt ? `salió ${formatTime(goneAt)}` : `sale ${order.eta ?? ''}`}
          </span>
        ) : (
          <span className="tag rechazado">rechazado</span>
        )}
        <span className="meta">
          {order.status === 'rechazado' ? (
            order.rejectReason
          ) : (
            <>
              <Icon name={order.deliveryMethod === 'delivery' ? 'bike' : 'bag'} size="xs" />
              {order.deliveryMethod === 'delivery' ? 'Envío' : 'Retiro'} · {formatPrice(order.total)}
              {order.manual && ' · a mano'}
              {order.notes && <span className="flag">· con observaciones</span>}
              {order.status === 'confirmado' && order.paymentMethod === 'mixed' && order.cashAmount === null && (
                <span className="flag">· falta el cobro</span>
              )}
            </>
          )}
        </span>
      </button>
    );
  };

  const showPendingBand = panel !== 'pedidos' && pending.length > 0;
  const showPausedBand = panel !== 'menu' && menu?.ordersPaused === true;

  return (
    <div className="shell">
      <aside className="rail">
        <img className="logo" src="logo.png" alt="EnSushi" />
        <nav aria-label="Secciones">
          {NAV.map((item) => (
            <div key={item.panel} style={{ display: 'contents' }}>
              {item.panel === 'menu' && <div className="sep" />}
              <button className="nav" aria-current={panel === item.panel ? 'page' : undefined} onClick={() => setPanel(item.panel)}>
                <Icon name={item.icon} />
                {item.label}
                {item.panel === 'pedidos' && pending.length > 0 && (
                  <span className="count" aria-label={`${pending.length} por responder`}>
                    {pending.length}
                  </span>
                )}
                {item.panel === 'cocina' && inKitchen > 0 && (
                  <span className="count soft" aria-label={`${inKitchen} en cocina`}>
                    {inKitchen}
                  </span>
                )}
              </button>
            </div>
          ))}
        </nav>
        <div className="foot">
          {updateVersion && (
            <div className="note">
              <span>Versión nueva ({updateVersion}). Se instala al cerrar la app.</span>
              <button className="btn sm" onClick={() => void window.ensushi.installUpdate()}>
                <Icon name="download" size="sm" />
                Actualizar ahora
              </button>
            </div>
          )}
          <div className={connection ? 'live down' : 'live'} role="status">
            {connection ?? (lastUpdate ? `Actualizado ${formatTime(lastUpdate)}` : 'Conectando…')}
          </div>
          <button
            className="nav"
            onClick={async () => {
              await window.ensushi.logout();
              onLoggedOut();
            }}
          >
            <Icon name="out" size="sm" />
            Salir
          </button>
        </div>
      </aside>

      <div className="content">
        {showPendingBand && oldestPending && (
          <div className="band" role="alert">
            <Icon name="bell" />
            <strong>{pending.length === 1 ? '1 pedido por responder' : `${pending.length} pedidos por responder`}</strong>
            <span className="num">
              {pending.length === 1 ? 'llegó' : 'el más viejo llegó'} {waitingFor(oldestPending.createdAt, now)}
            </span>
            <button className="btn" onClick={() => openOrder(oldestPending.id)}>
              Ver {pending.length === 1 ? 'pedido' : 'pedidos'} <Icon name="arrow" size="sm" />
            </button>
          </div>
        )}
        {showPausedBand && (
          <div className="band calm">
            <Icon name="pause" />
            <strong>Pedidos pausados por hoy</strong>
            <span>La web no deja mandar pedidos.</span>
            <button className="btn" onClick={() => void resumeOrders()}>
              Reanudar
            </button>
          </div>
        )}

        <div className="body">
          <div hidden={panel !== 'nuevo'}>
            <NewOrder key={newOrderKey} visible={panel === 'nuevo'} onCreated={orderCreated} onCancel={() => setNewOrderKey((key) => key + 1)} />
          </div>
          {panel === 'pedidos' && (
            <div className="split">
              <section className="list" aria-label="Lista de pedidos">
                <header>
                  <h1>Pedidos</h1>
                  <span className="today num">
                    {confirmed.length === 0
                      ? 'Hoy todavía no hay confirmados'
                      : `Hoy: ${confirmed.length} ${confirmed.length === 1 ? 'confirmado' : 'confirmados'} · ${formatPrice(confirmedTotal)}`}
                  </span>
                </header>
                {pending.length > 0 && (
                  <>
                    <div className="group">
                      <span>Por responder</span>
                      <span>↑ ↓ para moverte</span>
                    </div>
                    <div className="order-list">{pending.map(listItem)}</div>
                  </>
                )}
                {others.length > 0 && (
                  <>
                    <div className="group">
                      <span>Respondidos</span>
                    </div>
                    <div className="order-list">{others.map(listItem)}</div>
                  </>
                )}
                {orders.length === 0 && (
                  <p className="empty">{connection ? 'Sin conexión: la lista vuelve sola cuando haya.' : 'Todavía no hay pedidos hoy.'}</p>
                )}
              </section>
              {selected ? (
                <OrderDetail key={selected.id} order={selected} settings={settings} now={now} onUpdated={replaceOrder} />
              ) : (
                <div className="center-screen">
                  <p className="muted" style={{ textAlign: 'center' }}>
                    {pending.length > 0 ? 'Elegí un pedido de la lista (o tocá ↓).' : 'Elegí un pedido de la lista.'}
                  </p>
                </div>
              )}
            </div>
          )}
          {panel === 'cocina' && (
            <Kitchen
              orders={orders}
              gone={gone}
              onGone={(id) => updateGone((prev) => ({ ...prev, [id]: new Date().toISOString() }))}
              onBack={(id) =>
                updateGone((prev) => {
                  const { [id]: _removed, ...rest } = prev;
                  return rest;
                })
              }
              onOpen={openOrder}
            />
          )}
          {panel === 'menu' && <MenuToday menu={menu} loadError={menuError} onChange={setMenu} />}
          {panel === 'codigos' && <DiscountCodes />}
          {panel === 'ventas' && <Sales />}
          {panel === 'ajustes' && <SettingsPanel settings={settings} onSaved={onSettingsSaved} />}
        </div>
      </div>
    </div>
  );
}
