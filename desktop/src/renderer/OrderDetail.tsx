import { useState } from 'react';

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

const QUICK_MINUTES = [15, 30, 45, 60] as const;
const DISCARD_REASON = 'Cargado por error';

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
    <div className="panel">
      <strong>Cobro mixto</strong> <span className="muted">· cuando lo arreglen por WhatsApp, cargá cuánto fue en efectivo</span>
      <div className="row" style={{ marginTop: 8 }}>
        <label htmlFor="cash" style={{ margin: 0 }}>
          En efectivo $
        </label>
        <input
          id="cash"
          inputMode="numeric"
          style={{ width: 140 }}
          value={cash}
          onChange={(e) => setCash(e.target.value.replace(/\D/g, ''))}
        />
        <span>Transferencia: {valid && amount !== null ? formatPrice(order.total - amount) : '—'}</span>
        <button className="primary" disabled={!valid || saving || amount === order.cashAmount} onClick={() => void save()}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {amount !== null && !valid && <p className="error">No puede pasar el total ({formatPrice(order.total)}).</p>}
      {order.cashAmount === null && <p className="error">Falta cargar el cobro.</p>}
    </div>
  );
}

interface OrderDetailProps {
  order: StaffOrder;
  settings: Settings;
  onUpdated: (order: StaffOrder) => void;
}

/** The comanda, and the answer: an approximate time (confirm) or a reason (reject), then WhatsApp */
export function OrderDetail({ order, settings, onUpdated }: OrderDetailProps) {
  // Empty until the person answering sets it: the app never picks the time on its own
  const [eta, setEta] = useState(order.eta ?? '');
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
  const missingEta = mode === 'confirmar' && !eta;

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

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>
            Pedido #{order.number} · {formatTime(order.createdAt)}
          </h2>
          <span className={`tag ${order.status}`}>{order.status}</span>
        </div>
        <p>
          <strong>{order.customerName}</strong> · Tel {formatPhone(order.phone)} · {order.email ?? 'Cargado a mano'}
          <br />
          <strong>{DELIVERY_LABELS[order.deliveryMethod]}</strong>
          {order.address ? ` · ${order.address}` : ''} · Pago: {PAYMENT_LABELS[order.paymentMethod]}
        </p>
        {order.notes && <p className="notes">Observaciones: {order.notes}</p>}
        <table>
          <tbody>
            {order.lines.map((line, index) => (
              <tr key={index}>
                <td>
                  <strong>
                    {line.quantity}x {line.name}
                  </strong>
                  {line.detail && <div className="muted">{line.detail}</div>}
                </td>
                <td className="num">{formatPrice(line.subtotal)}</td>
              </tr>
            ))}
            {order.discountAmount > 0 && (
              <tr>
                <td>Descuento ({order.discountLabel})</td>
                <td className="num">-{formatPrice(order.discountAmount)}</td>
              </tr>
            )}
            {order.deliveryFee > 0 && (
              <tr>
                <td>Envío</td>
                <td className="num">{formatPrice(order.deliveryFee)}</td>
              </tr>
            )}
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td className="num">
                <strong>{formatPrice(order.total)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="row">
          <button onClick={() => void print(order)} disabled={!settings.printerName}>
            Imprimir comanda
          </button>
          {order.printedAt && <span className="muted">Impresa {formatTime(order.printedAt)}</span>}
          {!settings.printerName && <span className="muted">Elegí la ticketera en Ajustes.</span>}
        </p>
      </div>

      {order.paymentMethod === 'mixed' && order.status !== 'rechazado' && (
        <MixedPayment key={order.cashAmount ?? 'none'} order={order} send={send} />
      )}

      <div className="panel">
        {decided ? (
          <p>
            {order.status === 'confirmado' ? (
              <>
                Confirmado: sale aprox. a las <strong>{order.eta}</strong>.
              </>
            ) : (
              <>Rechazado: {order.rejectReason}</>
            )}
          </p>
        ) : (
          <>
            <div className="row">
              <button className={mode === 'confirmar' ? 'primary' : ''} onClick={() => { setMode('confirmar'); setCustomMessage(null); }}>
                Confirmar
              </button>
              <button className={mode === 'rechazar' ? 'primary' : ''} onClick={() => { setMode('rechazar'); setCustomMessage(null); }}>
                Rechazar
              </button>
            </div>

            {mode === 'confirmar' ? (
              <>
                <label htmlFor="eta">Sale aprox. a las</label>
                <div className="row">
                  <input id="eta" type="time" style={{ width: 140 }} value={eta} onChange={(e) => { setEta(e.target.value); setCustomMessage(null); }} />
                  {QUICK_MINUTES.map((minutes) => (
                    <button key={minutes} onClick={() => { setEta(etaIn(minutes)); setCustomMessage(null); }}>
                      +{minutes} min
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <label htmlFor="reason">Motivo</label>
                <div className="row" style={{ marginBottom: 6 }}>
                  {REJECT_REASONS.map((preset) => (
                    <button key={preset} onClick={() => { setReason(preset); setCustomMessage(null); }}>
                      {preset}
                    </button>
                  ))}
                </div>
                <input id="reason" value={reason} onChange={(e) => { setReason(e.target.value); setCustomMessage(null); }} />
              </>
            )}

            {missingEta ? (
              <p className="muted">Poné la hora aproximada para ver el mensaje.</p>
            ) : (
              <>
                <label htmlFor="message">Mensaje para el cliente (se puede editar)</label>
                <textarea id="message" value={message} onChange={(e) => setCustomMessage(e.target.value)} />
              </>
            )}
          </>
        )}

        <p className="row">
          {!decided && (
            <button
              className={mode === 'confirmar' ? 'primary' : 'danger'}
              disabled={busy || missingEta || (mode === 'rechazar' && !reason.trim())}
              onClick={answer}
            >
              {busy ? 'Guardando…' : mode === 'confirmar' ? 'Confirmar y abrir WhatsApp' : 'Rechazar y abrir WhatsApp'}
            </button>
          )}
          {!decided && order.manual && !confirmDiscard && <button onClick={() => setConfirmDiscard(true)}>Descartar (se cargó mal)</button>}
          {!decided && order.manual && confirmDiscard && (
            <>
              ¿Descartarlo sin avisarle al cliente?
              <button className="danger" disabled={busy} onClick={() => void discard()}>Sí, descartar</button>
              <button onClick={() => setConfirmDiscard(false)}>No</button>
            </>
          )}
          {decided && order.rejectReason !== DISCARD_REASON && (
            <button
              onClick={() =>
                window.ensushi.openWhatsApp(
                  order.phone,
                  order.status === 'confirmado' ? confirmMessage(order, order.eta ?? '', settings) : rejectMessage(order, order.rejectReason ?? ''),
                )
              }
            >
              Volver a abrir WhatsApp
            </button>
          )}
        </p>
        {error && <p className="error">{error}</p>}
        {notice && <p>{notice}</p>}
      </div>
    </div>
  );
}
