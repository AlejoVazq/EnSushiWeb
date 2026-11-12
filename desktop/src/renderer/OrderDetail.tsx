import { useEffect, useState } from 'react';

import type { StaffOrder, StaffOrderAction } from '../../../src/types/pedidos';
import type { Settings } from '../shared/bridge';
import {
  comandaHtml,
  confirmMessage,
  DELIVERY_LABELS,
  etaIn,
  formatPhone,
  formatPrice,
  formatTime,
  PAYMENT_LABELS,
  REJECT_REASONS,
  rejectMessage,
} from '../shared/textos';

import { DeliveryBlock, DriversList } from './Delivery';
import { Icon, isTyping, Kbd } from './ui';

const QUICK_MINUTES = [15, 30, 45, 60] as const;
const DISCARD_REASON = 'Cargado por error';

/** "21:30", always 24 h (the time field is text: a native one follows the PC's locale and can show 12 h) */
const ETA_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** What's typed in the time field, as "HH:MM": digits only, the colon goes in by itself */
const typeEta = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
};

/** "hace 4 min" */
export const waitingFor = (createdAt: string, now: number): string => {
  const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000));
  return minutes === 0 ? 'recién' : `hace ${minutes} min`;
};

/** An order waiting this long without an answer is late: it shows in red and beeps again */
export const LATE_AFTER_MS = 3 * 60_000;

export const isLate = (order: StaffOrder, now: number): boolean =>
  order.status === 'nuevo' && now - new Date(order.createdAt).getTime() > LATE_AFTER_MS;

interface MixedPaymentProps {
  order: StaffOrder;
  send: (action: StaffOrderAction) => Promise<StaffOrder | null>;
}

/** Mixed payments are settled by WhatsApp; the cash part is loaded here so the sales add up */
function MixedPayment({ order, send }: MixedPaymentProps) {
  const [cash, setCash] = useState(order.cashAmount === null ? '' : String(order.cashAmount));
  const [saving, setSaving] = useState(false);
  const amount = cash === '' ? null : Number(cash);
  const valid = amount !== null && amount <= order.total;

  const save = async () => {
    if (amount === null) return;
    setSaving(true);
    await send({ action: 'cobro', cashAmount: amount });
    setSaving(false);
  };

  return (
    <div className={order.cashAmount === null ? 'block alert' : 'block'}>
      <div className="block-head">
        <h3>Cobro mixto</h3>
        {order.cashAmount === null ? <span className="flag small">Falta cargar el cobro</span> : <span className="tag confirmado">Cargado</span>}
      </div>
      <p className="muted small">Cuando lo arreglen por WhatsApp, cargá cuánto fue en efectivo. El resto cuenta como transferencia.</p>
      <div className="inline">
        <label htmlFor="cash" className="label">
          En efectivo $
        </label>
        <input
          id="cash"
          className="w-sm num"
          inputMode="numeric"
          value={cash}
          onChange={(e) => setCash(e.target.value.replace(/\D/g, ''))}
        />
        <span className="num">Transferencia: {valid && amount !== null ? formatPrice(order.total - amount) : '—'}</span>
        <button className="btn primary" disabled={!valid || saving || amount === order.cashAmount} onClick={() => void save()}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {amount !== null && !valid && <p className="error">No puede pasar el total ({formatPrice(order.total)}).</p>}
    </div>
  );
}

interface OrderDetailProps {
  order: StaffOrder;
  settings: Settings;
  /** For "hace N min"; moves with the list's polling */
  now: number;
  /** Delivery drivers to suggest */
  drivers: readonly string[];
  onUpdated: (order: StaffOrder) => void;
}

/** The comanda, and the answer: an approximate time (confirm) or a reason (reject), then WhatsApp */
export function OrderDetail({ order, settings, now, drivers, onUpdated }: OrderDetailProps) {
  // Empty until the person answering sets it: the app never picks the time on its own
  const [eta, setEta] = useState(order.eta ?? '');
  // Which quick button set the time, to show it pressed (null once the time is typed by hand)
  const [quick, setQuick] = useState<number | null>(null);
  const [reason, setReason] = useState(REJECT_REASONS[0] ?? '');
  const [mode, setMode] = useState<'confirmar' | 'rechazar'>('confirmar');
  // The message follows the time/reason until it's edited by hand
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const message = customMessage ?? (mode === 'confirmar' ? confirmMessage(order, eta, settings) : rejectMessage(order, reason));
  const decided = order.status !== 'nuevo';
  const missingEta = mode === 'confirmar' && !ETA_PATTERN.test(eta);
  const canAnswer = !decided && !busy && !missingEta && (mode === 'confirmar' || reason.trim().length > 0);

  const send = async (action: StaffOrderAction) => {
    const response = await window.ensushi.api('PATCH', `/api/local/pedidos/${order.id}`, action);
    if (response.status !== 200) {
      const data = response.data;
      setError(typeof data === 'object' && data !== null && 'error' in data ? String(data.error) : 'No se pudo guardar.');
      return null;
    }
    const updated = response.data as StaffOrder;
    onUpdated(updated);
    return updated;
  };

  const print = async (target: StaffOrder) => {
    const result = await window.ensushi.print(comandaHtml(target, settings.paperWidth));
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice('Comanda enviada a la impresora.');
    await send({ action: 'impreso' });
  };

  /** A hand-loaded order with a mistake: out of the way without writing to the customer (rejected orders don't count as sales) */
  const discard = async () => {
    setBusy(true);
    setError(null);
    await send({ action: 'rechazar', reason: DISCARD_REASON });
    setBusy(false);
  };

  const answer = async () => {
    if (!canAnswer) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const updated = await send(mode === 'confirmar' ? { action: 'confirmar', eta } : { action: 'rechazar', reason });
    if (updated) {
      await window.ensushi.openWhatsApp(order.phone, message);
      if (mode === 'confirmar' && settings.printOnConfirm) await print(updated);
    }
    setBusy(false);
  };

  const quickEta = (minutes: number) => {
    setEta(etaIn(minutes));
    setQuick(minutes);
    setCustomMessage(null);
  };

  const switchMode = (next: 'confirmar' | 'rechazar') => {
    setMode(next);
    setCustomMessage(null);
  };

  // Shortcuts: 1–4 quick times, Enter answers, P prints. Never while typing (Enter in the time field does answer).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const typing = isTyping(event.target);
      if (event.key === 'p' || event.key === 'P') {
        if (typing || !settings.printerName) return;
        event.preventDefault();
        void print(order);
        return;
      }
      if (decided) return;
      const index = ['1', '2', '3', '4'].indexOf(event.key);
      if (index >= 0 && !typing && mode === 'confirmar') {
        event.preventDefault();
        quickEta(QUICK_MINUTES[index] ?? 30);
        return;
      }
      if (event.key === 'Enter' && !event.repeat && (!typing || (event.target instanceof HTMLElement && event.target.id === 'eta'))) {
        // Also on a focused button: Enter answers instead of pressing it again
        event.preventDefault();
        void answer();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const late = isLate(order, now);
  const answerLabel = busy ? 'Guardando…' : mode === 'confirmar' ? 'Confirmar y abrir WhatsApp' : 'Rechazar y abrir WhatsApp';

  return (
    <section className="detail" aria-label={`Pedido ${order.number}`}>
      <div className="ticket">
        <div className="dhead">
          <h2 className="num">Pedido #{order.number}</h2>
          <span className="when num">
            Llegó {formatTime(order.createdAt)}
            {order.status === 'nuevo' && (
              <>
                {' · '}
                <b className={late ? 'flag' : undefined}>{waitingFor(order.createdAt, now)}</b>
              </>
            )}
          </span>
          {order.manual && <span className="tag quiet">Cargado a mano</span>}
          <div className="end">
            {order.printedAt && <span className="muted small num">Impresa {formatTime(order.printedAt)}</span>}
            <button
              className="btn"
              onClick={() => void print(order)}
              disabled={!settings.printerName}
              title={settings.printerName ? undefined : 'Elegí la ticketera en Ajustes'}
            >
              <Icon name="printer" size="sm" />
              Imprimir comanda <Kbd>P</Kbd>
            </button>
          </div>
        </div>

        <dl className="facts">
          <div>
            <dt>Cliente</dt>
            <dd>
              {order.customerName}
              <small className="num">
                {formatPhone(order.phone)}
                {order.email ? ` · ${order.email}` : ''}
              </small>
            </dd>
          </div>
          <div>
            <dt>{DELIVERY_LABELS[order.deliveryMethod]}</dt>
            <dd>
              {order.deliveryMethod === 'delivery' ? order.address : 'Lo retira'}
              {order.deliveryMethod === 'pickup' && <small>{settings.pickupAddress}</small>}
            </dd>
          </div>
          <div>
            <dt>Pago</dt>
            <dd>
              {PAYMENT_LABELS[order.paymentMethod]}
              {order.paymentMethod === 'transfer' && !decided && <small>le pasás el alias al confirmar</small>}
              {order.paymentMethod === 'mixed' && <small>cuánto de cada uno, por WhatsApp</small>}
            </dd>
          </div>
        </dl>

        {order.notes && (
          <div className="notice">
            <Icon name="note" />
            <div>
              <small>Observaciones</small>
              {order.notes}
            </div>
          </div>
        )}

        <table className="lines">
          <tbody>
            {order.lines.map((line, index) => (
              <tr key={index}>
                <td className="q">{line.quantity}×</td>
                <td className="name">
                  {line.name}
                  {line.detail && <span className="detail-line">{line.detail}</span>}
                </td>
                <td className="amt">{formatPrice(line.subtotal)}</td>
              </tr>
            ))}
            {order.discountAmount > 0 && (
              <tr className="sub">
                <td />
                <td>Descuento ({order.discountLabel})</td>
                <td className="amt kin">−{formatPrice(order.discountAmount)}</td>
              </tr>
            )}
            {order.deliveryFee > 0 && (
              <tr className="sub">
                <td />
                <td>Envío</td>
                <td className="amt">{formatPrice(order.deliveryFee)}</td>
              </tr>
            )}
            <tr className="total">
              <td />
              <td>Total</td>
              <td className="amt">{formatPrice(order.total)}</td>
            </tr>
          </tbody>
        </table>

        {order.paymentMethod === 'mixed' && order.status !== 'rechazado' && (
          <MixedPayment key={order.cashAmount ?? 'none'} order={order} send={send} />
        )}

        {order.deliveryMethod === 'delivery' && order.status === 'confirmado' && (
          <>
            <DriversList drivers={drivers} />
            <DeliveryBlock
              key={`${order.driver ?? ''}:${order.driverFloat ?? ''}:${order.driverReturned ?? ''}:${order.cashAmount ?? ''}`}
              order={order}
              drivers={drivers}
              onSaved={onUpdated}
            />
          </>
        )}
      </div>

      <div className="dock">
        {decided ? (
          <div className="done">
            {order.status === 'confirmado' ? (
              <>
                <Icon name="check" />
                <span>
                  Confirmado · sale aprox. a las <strong className="num">{order.eta}</strong>
                </span>
              </>
            ) : (
              <span>
                Rechazado: <strong>{order.rejectReason}</strong>
              </span>
            )}
            {order.rejectReason !== DISCARD_REASON && (
              <button
                className="btn"
                style={{ marginLeft: 'auto' }}
                onClick={() =>
                  window.ensushi.openWhatsApp(
                    order.phone,
                    order.status === 'confirmado' ? confirmMessage(order, order.eta ?? '', settings) : rejectMessage(order, order.rejectReason ?? ''),
                  )
                }
              >
                <Icon name="chat" size="sm" />
                Volver a abrir WhatsApp
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="dock-row">
              <div className="seg" role="group" aria-label="Respuesta">
                <button aria-pressed={mode === 'confirmar'} onClick={() => switchMode('confirmar')}>
                  Confirmar
                </button>
                <button aria-pressed={mode === 'rechazar'} onClick={() => switchMode('rechazar')}>
                  Rechazar
                </button>
              </div>
              {order.manual && (
                <span className="inline" style={{ marginLeft: 'auto' }}>
                  {confirmDiscard ? (
                    <>
                      <span className="small">¿Descartarlo sin avisarle al cliente?</span>
                      <button className="btn sm danger" disabled={busy} onClick={() => void discard()}>
                        Sí, descartar
                      </button>
                      <button className="btn sm" onClick={() => setConfirmDiscard(false)}>
                        No
                      </button>
                    </>
                  ) : (
                    <button className="btn sm ghost" onClick={() => setConfirmDiscard(true)}>
                      Descartar (se cargó mal)
                    </button>
                  )}
                </span>
              )}
            </div>

            {mode === 'confirmar' ? (
              <div className="dock-row">
                <label htmlFor="eta" className="label">
                  Sale aprox. a las
                </label>
                <input
                  id="eta"
                  className="eta-input"
                  inputMode="numeric"
                  placeholder="--:--"
                  maxLength={5}
                  autoComplete="off"
                  aria-invalid={eta.length === 5 && !ETA_PATTERN.test(eta)}
                  value={eta}
                  onChange={(e) => {
                    setEta(typeEta(e.target.value));
                    setQuick(null);
                    setCustomMessage(null);
                  }}
                />
                {QUICK_MINUTES.map((minutes, index) => (
                  <button key={minutes} className="choice lg" aria-pressed={quick === minutes} onClick={() => quickEta(minutes)}>
                    +{minutes} <Kbd>{index + 1}</Kbd>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dock-row">
                <label htmlFor="reason" className="label">
                  Motivo
                </label>
                {REJECT_REASONS.map((preset) => (
                  <button
                    key={preset}
                    className="choice"
                    aria-pressed={reason === preset}
                    onClick={() => {
                      setReason(preset);
                      setCustomMessage(null);
                    }}
                  >
                    {preset}
                  </button>
                ))}
                <input
                  id="reason"
                  style={{ flex: '1 1 220px', width: 'auto' }}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setCustomMessage(null);
                  }}
                />
              </div>
            )}

            {missingEta ? (
              <p className="muted small">Poné la hora aproximada (por ejemplo 21:30) o tocá 1, 2, 3 o 4 para ver el mensaje.</p>
            ) : (
              <div className="field">
                <label htmlFor="message">
                  Mensaje <span>se puede editar</span>
                </label>
                <textarea id="message" value={message} onChange={(e) => setCustomMessage(e.target.value)} />
              </div>
            )}

            <button className={mode === 'confirmar' ? 'plate go' : 'plate'} disabled={!canAnswer} onClick={() => void answer()}>
              <Icon name="chat" />
              {answerLabel}
              {!busy && <Kbd>Enter</Kbd>}
            </button>
          </>
        )}
        {error && <p className="error">{error}</p>}
        {notice && <p className="ok small">{notice}</p>}
      </div>
    </section>
  );
}
