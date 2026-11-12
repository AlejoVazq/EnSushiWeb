import { useState, type KeyboardEvent } from 'react';

import type { StaffOrder, StaffOrderAction } from '../../../src/types/pedidos';
import { cashCollected, driverOwes, formatDifference } from '../shared/caja';
import { formatPrice } from '../shared/textos';

const errorOf = (data: unknown): string =>
  typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : 'No se pudo guardar.';

/** "" or digits only, as typed; null when empty */
const toAmount = (value: string): number | null => (value === '' ? null : Number(value));
const fromAmount = (value: number | null): string => (value === null ? '' : String(value));

/** Who took a delivery, the change they took and what they handed in: edited here, saved with one button */
function useDeliveryDraft(order: StaffOrder, onSaved: (order: StaffOrder) => void) {
  const [driver, setDriver] = useState(order.driver ?? '');
  const [float, setFloat] = useState(fromAmount(order.driverFloat));
  const [returned, setReturned] = useState(fromAmount(order.driverReturned));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft: StaffOrder = { ...order, driver: driver.trim() || null, driverFloat: toAmount(float), driverReturned: toAmount(returned) };
  const dirty =
    draft.driver !== order.driver || draft.driverFloat !== order.driverFloat || draft.driverReturned !== order.driverReturned;
  const missingDriver = !draft.driver && (draft.driverFloat !== null || draft.driverReturned !== null);

  const save = async () => {
    if (!dirty || missingDriver || saving) return;
    setSaving(true);
    setError(null);
    const action: StaffOrderAction = {
      action: 'delivery',
      driver: draft.driver ?? '',
      driverFloat: draft.driverFloat,
      driverReturned: draft.driverReturned,
    };
    const response = await window.ensushi.api('PATCH', `/api/local/pedidos/${order.id}`, action);
    setSaving(false);
    if (response.status === 200) onSaved(response.data as StaffOrder);
    else setError(errorOf(response.data));
  };

  const owes = driverOwes(draft);
  const difference = owes === null || draft.driverReturned === null ? null : draft.driverReturned - owes;

  return {
    fields: { driver, setDriver, float, setFloat, returned, setReturned },
    draft,
    owes,
    difference,
    dirty,
    missingDriver,
    saving,
    error,
    save,
  };
}

/** "Efectivo · $ 23.000" / "Transferencia" / "Mixto · falta el cobro" */
export const describeCollection = (order: StaffOrder): string => {
  const cash = cashCollected(order);
  if (order.paymentMethod === 'transfer') return 'Transferencia (no cobra)';
  if (cash === null) return 'Mixto · falta cargar el cobro';
  return order.paymentMethod === 'mixed' ? `Cobra ${formatPrice(cash)} en efectivo` : `Cobra ${formatPrice(cash)}`;
};

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const DRIVERS_LIST_ID = 'drivers-list';

/** Recent drivers, for the name fields to suggest */
export function DriversList({ drivers }: { drivers: readonly string[] }) {
  return (
    <datalist id={DRIVERS_LIST_ID}>
      {drivers.map((driver) => (
        <option key={driver} value={driver} />
      ))}
    </datalist>
  );
}

interface DeliveryProps {
  order: StaffOrder;
  onSaved: (order: StaffOrder) => void;
}

/** One delivery as a row of the Caja screen's table */
export function DeliveryRow({ order, onSaved }: DeliveryProps) {
  const { fields, owes, difference, dirty, missingDriver, saving, error, save } = useDeliveryDraft(order, onSaved);
  const onEnter = (event: KeyboardEvent) => {
    if (event.key === 'Enter') void save();
  };
  return (
    <tr>
      <td className="num" style={{ fontFamily: 'var(--display)', fontWeight: 700, width: 56 }}>
        #{order.number}
      </td>
      <td>
        <span className="name">{order.customerName}</span>
        <span className="detail-line">{describeCollection(order)}</span>
      </td>
      <td>
        <input
          aria-label={`Delivery del pedido ${order.number}`}
          list={DRIVERS_LIST_ID}
          placeholder="¿Quién lo lleva?"
          maxLength={40}
          style={{ width: 170 }}
          value={fields.driver}
          aria-invalid={missingDriver || undefined}
          onChange={(e) => fields.setDriver(e.target.value)}
          onKeyDown={onEnter}
        />
      </td>
      <td>
        <input
          aria-label={`Cambio que se llevó, pedido ${order.number}`}
          inputMode="numeric"
          className="num"
          placeholder="$ 0"
          style={{ width: 110 }}
          value={fields.float}
          onChange={(e) => fields.setFloat(onlyDigits(e.target.value))}
          onKeyDown={onEnter}
        />
      </td>
      <td className="amt">{owes === null ? '—' : formatPrice(owes)}</td>
      <td>
        <input
          aria-label={`Lo que entregó, pedido ${order.number}`}
          inputMode="numeric"
          className="num"
          placeholder="todavía no"
          style={{ width: 120 }}
          value={fields.returned}
          onChange={(e) => fields.setReturned(onlyDigits(e.target.value))}
          onKeyDown={onEnter}
        />
      </td>
      <td className={difference !== null && difference < 0 ? 'amt flag' : 'amt'}>
        {difference === null ? '' : formatDifference(difference, formatPrice)}
      </td>
      <td className="actions">
        {error && <span className="error small">{error} </span>}
        {missingDriver && <span className="error small">Falta quién lo lleva </span>}
        <button className="btn sm primary" disabled={!dirty || missingDriver || saving} onClick={() => void save()}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </td>
    </tr>
  );
}

interface DeliveryBlockProps extends DeliveryProps {
  drivers: readonly string[];
}

/** The same, as a block of the order's detail */
export function DeliveryBlock({ order, drivers, onSaved }: DeliveryBlockProps) {
  const { fields, owes, difference, dirty, missingDriver, saving, error, save } = useDeliveryDraft(order, onSaved);
  const back = order.driverReturned !== null;
  return (
    <div className={order.driver && !back ? 'block alert' : 'block'}>
      <div className="block-head">
        <h3>Delivery</h3>
        {!order.driver ? (
          <span className="muted small">Sin asignar</span>
        ) : back ? (
          <span className="tag confirmado">Entregó la plata</span>
        ) : (
          <span className="flag small">Falta que entregue la plata</span>
        )}
        <span className="end muted small">{describeCollection(order)}</span>
      </div>
      <div className="inline" style={{ gap: 16, alignItems: 'flex-end' }}>
        <div className="field">
          <label htmlFor="driver">Quién lo lleva</label>
          <input
            id="driver"
            list={DRIVERS_LIST_ID}
            maxLength={40}
            className="w-md"
            placeholder="Nombre"
            value={fields.driver}
            aria-invalid={missingDriver || undefined}
            onChange={(e) => fields.setDriver(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="driver-float">Se llevó de cambio $</label>
          <input
            id="driver-float"
            inputMode="numeric"
            className="w-sm num"
            placeholder="0"
            value={fields.float}
            onChange={(e) => fields.setFloat(onlyDigits(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="driver-returned">Entregó $</label>
          <input
            id="driver-returned"
            inputMode="numeric"
            className="w-sm num"
            placeholder="todavía no"
            value={fields.returned}
            onChange={(e) => fields.setReturned(onlyDigits(e.target.value))}
          />
        </div>
        <button className="btn primary" disabled={!dirty || missingDriver || saving} onClick={() => void save()}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {drivers.length > 0 && !fields.driver && (
        <div className="choices" role="group" aria-label="Deliverys de siempre">
          {drivers.slice(0, 6).map((name) => (
            <button key={name} className="choice" onClick={() => fields.setDriver(name)}>
              {name}
            </button>
          ))}
        </div>
      )}
      <p className="num">
        Tiene que entregar: <b>{owes === null ? 'cargá primero el cobro mixto' : formatPrice(owes)}</b>
        {difference !== null && (
          <>
            {' · '}
            <b className={difference < 0 ? 'flag' : undefined}>{formatDifference(difference, formatPrice)}</b>
          </>
        )}
      </p>
      {missingDriver && <p className="error">Falta quién lo lleva.</p>}
      {error && <p className="error">{error}</p>}
      <p className="muted small">Es el cambio que se llevó más lo que cobra en efectivo, con el envío incluido.</p>
    </div>
  );
}
