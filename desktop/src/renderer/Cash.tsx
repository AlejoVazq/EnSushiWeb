import { useCallback, useEffect, useState } from 'react';

import type { StaffCashDay, StaffCashInput, StaffOrder } from '../../../src/types/pedidos';
import { formatDifference, summarizeCash, summarizeDrivers } from '../shared/caja';
import { formatPrice } from '../shared/textos';
import { formatDay } from '../shared/ventas';

import { DeliveryRow, DriversList } from './Delivery';

const errorText = (data: unknown): string =>
  typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : 'Error del servidor.';

/** While the screen is open: other changes (a new order confirmed, a delivery loaded from its order) show up */
const POLL_MS = 10_000;

/** What today's drawer started with, editable all day */
function OpeningAmount({ cash, onSaved }: { cash: StaffCashDay; onSaved: (cash: StaffCashDay) => void }) {
  const [value, setValue] = useState(cash.openingAmount === null ? '' : String(cash.openingAmount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = value === '' ? null : Number(value);

  const save = async () => {
    if (amount === null || amount === cash.openingAmount || saving) return;
    setSaving(true);
    setError(null);
    const input: StaffCashInput = { openingAmount: amount };
    const response = await window.ensushi.api('PATCH', '/api/local/caja', input);
    setSaving(false);
    if (response.status === 200) onSaved(response.data as StaffCashDay);
    else setError(errorText(response.data));
  };

  return (
    <section className={cash.openingAmount === null ? 'block alert' : 'block'}>
      <div className="block-head">
        <h2>Con cuánto arranca la caja</h2>
        {cash.openingAmount === null ? <span className="flag small">Falta cargarlo</span> : <span className="tag confirmado">Cargado</span>}
      </div>
      <div className="inline">
        <label htmlFor="opening" className="label">
          Fondo $
        </label>
        <input
          id="opening"
          inputMode="numeric"
          className="w-sm num"
          placeholder="0"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save();
          }}
        />
        <button className="btn primary" disabled={amount === null || amount === cash.openingAmount || saving} onClick={() => void save()}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <span className="muted small">El cambio con el que se abre: billetes chicos y monedas.</span>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

/** Today's cash drawer: the opening amount, the cash orders and what each delivery driver took and handed in */
export function Cash({ visible }: { visible: boolean }) {
  const [cash, setCash] = useState<StaffCashDay | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await window.ensushi.api('GET', '/api/local/caja');
    if (response.status === 200 && typeof response.data === 'object' && response.data !== null) {
      setCash(response.data as StaffCashDay);
      setError(null);
    } else setError(errorText(response.data));
  }, []);

  useEffect(() => {
    if (!visible) return;
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [visible, load]);

  const replaceOrder = (updated: StaffOrder) =>
    setCash((prev) => (prev ? { ...prev, orders: prev.orders.map((order) => (order.id === updated.id ? updated : order)) } : prev));

  if (!cash) {
    return (
      <div className="page">
        <h1>Caja</h1>
        {error ? <p className="error">{error}</p> : <p className="muted">Cargando…</p>}
      </div>
    );
  }

  const summary = summarizeCash(cash.openingAmount, cash.orders);
  const deliveries = cash.orders.filter((order) => order.deliveryMethod === 'delivery');
  const drivers = summarizeDrivers(cash.orders);
  // Today's names first, then the usual ones
  const names = [...new Set([...drivers.map((line) => line.driver), ...cash.drivers])];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Caja</h1>
          <p className="muted num">Hoy, {formatDay(cash.day)}. Solo pedidos confirmados.</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <OpeningAmount key={cash.openingAmount ?? 'none'} cash={cash} onSaved={setCash} />

      <section style={{ display: 'grid', gap: 10 }}>
        <dl className="figures" style={{ margin: 0 }}>
          <div>
            <dt>Fondo</dt>
            <dd>{formatPrice(summary.opening)}</dd>
          </div>
          <div>
            <dt>Efectivo de retiros</dt>
            <dd>+ {formatPrice(summary.pickupCash)}</dd>
          </div>
          <div>
            <dt>Deliverys: entregaron − cambio</dt>
            <dd>
              {summary.handedIn - summary.floatsOut < 0 ? '− ' : '+ '}
              {formatPrice(Math.abs(summary.handedIn - summary.floatsOut))}
            </dd>
          </div>
          <div>
            <dt>Tiene que haber en caja</dt>
            <dd>{formatPrice(summary.expected)}</dd>
          </div>
        </dl>
        {summary.pendingDeliveries > 0 && (
          <p className="num">
            <b>
              {summary.pendingDeliveries === 1 ? '1 delivery todavía no entregó' : `${summary.pendingDeliveries} deliverys todavía no entregaron`}
            </b>{' '}
            la plata: tienen que traer {formatPrice(summary.pendingOwed)}, que suman arriba cuando cargues lo que entregaron.
          </p>
        )}
        {summary.difference !== 0 && (
          <p className={summary.difference < 0 ? 'error num' : 'num'}>
            En lo que ya entregaron: {formatDifference(summary.difference, formatPrice).toLowerCase()}.
          </p>
        )}
        {summary.unassigned > 0 && (
          <p className="muted">
            {summary.unassigned === 1 ? '1 envío sin delivery asignado.' : `${summary.unassigned} envíos sin delivery asignado.`}
          </p>
        )}
        {summary.unsplit > 0 && (
          <p className="error">
            {summary.unsplit === 1 ? '1 pedido mixto' : `${summary.unsplit} pedidos mixtos`} sin el cobro cargado: su efectivo todavía no
            cuenta. Cargalo en el pedido.
          </p>
        )}
      </section>

      <section className="block">
        <div className="block-head">
          <h2>Deliverys</h2>
          <span className="muted small">Quién lo lleva, cuánto cambio se llevó y cuánto entregó al volver.</span>
        </div>
        {deliveries.length === 0 ? (
          <p className="muted">Hoy todavía no hay envíos confirmados.</p>
        ) : (
          <>
            <DriversList drivers={names} />
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Delivery</th>
                  <th>Se llevó</th>
                  <th className="amt">Tiene que entregar</th>
                  <th>Entregó</th>
                  <th className="amt">Diferencia</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {deliveries.map((order) => (
                  <DeliveryRow
                    key={`${order.id}:${order.driver ?? ''}:${order.driverFloat ?? ''}:${order.driverReturned ?? ''}:${order.cashAmount ?? ''}`}
                    order={order}
                    onSaved={replaceOrder}
                  />
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {drivers.length > 0 && (
        <section className="block">
          <div className="block-head">
            <h2>Por delivery</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Delivery</th>
                <th className="amt">Pedidos</th>
                <th className="amt">Cambio</th>
                <th className="amt">Tiene que entregar</th>
                <th className="amt">Entregó</th>
                <th className="amt">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((line) => (
                <tr key={line.driver}>
                  <td className="name">{line.driver}</td>
                  <td className="amt">
                    {line.orders}
                    {line.pending > 0 && <span className="detail-line">{line.pending} sin entregar</span>}
                  </td>
                  <td className="amt">{formatPrice(line.floats)}</td>
                  <td className="amt">{formatPrice(line.owes)}</td>
                  <td className="amt">{formatPrice(line.handedIn)}</td>
                  <td className={line.difference < 0 ? 'amt flag' : 'amt'}>
                    {line.orders > line.pending ? formatDifference(line.difference, formatPrice) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
