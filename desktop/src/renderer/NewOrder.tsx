import { useEffect, useMemo, useState } from 'react';

import type {
  ManualLineRef,
  ManualOrderInput,
  OrderQuote,
  StaffBoxSize,
  StaffCatalog,
  StaffOrder,
} from '../../../src/types/pedidos';
import type { ApiResponse } from '../shared/bridge';
import { DELIVERY_LABELS, formatPrice, PAYMENT_LABELS } from '../shared/textos';

import { Icon } from './ui';

const errorOf = (response: ApiResponse, fallback: string): string => {
  const { data } = response;
  return typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : fallback;
};

interface DraftLine {
  /** Two equal lines add up: this tells them apart */
  key: string;
  name: string;
  detail: string | null;
  /** Only to show it; the amounts that count come from the server's quote */
  unitPrice: number;
  quantity: number;
  ref: ManualLineRef;
}

const BOX_TAB = 'box';

const sold = (
  <span className="tag out" style={{ marginLeft: 10 }}>
    Agotado hoy
  </span>
);

interface BoxBuilderProps {
  catalog: StaffCatalog;
  onAdd: (line: Omit<DraftLine, 'quantity'>) => void;
}

/** Arma tu combo: the same sizes and combinations as the web, which the server checks again */
function BoxBuilder({ catalog, onAdd }: BoxBuilderProps) {
  const { sizes, items, name: boxName } = catalog.box;
  const [sizeId, setSizeId] = useState(sizes[0]?.id ?? '');
  const [steps, setSteps] = useState<Record<string, number>>({});
  const size: StaffBoxSize | undefined = sizes.find((candidate) => candidate.id === sizeId);

  const count = (group: 'rolls' | 'nigiris') =>
    items.filter((item) => item.group === group).reduce((sum, item) => sum + item.step * (steps[item.id] ?? 0), 0);
  const rollPieces = count('rolls');
  const nigiris = count('nigiris');
  const valid = size?.combinations.some(
    (combination) => combination.rollPieces === rollPieces && nigiris >= combination.nigiris.min && nigiris <= combination.nigiris.max,
  );
  const chosen = items.filter((item) => (steps[item.id] ?? 0) > 0);
  const hasSoldOut = chosen.some((item) => item.soldOut);

  const change = (id: string, delta: number) =>
    setSteps((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      const { [id]: _removed, ...rest } = prev;
      return next === 0 ? rest : { ...rest, [id]: next };
    });

  const add = () => {
    if (!size) return;
    const orderedSteps = Object.fromEntries(chosen.map((item) => [item.id, steps[item.id] ?? 0]));
    onAdd({
      key: `box:${size.id}:${JSON.stringify(orderedSteps)}`,
      name: `${boxName} · ${size.name}`,
      detail: chosen.map((item) => `${item.name} ${item.step * (steps[item.id] ?? 0)}`).join(', '),
      unitPrice: chosen.reduce((sum, item) => sum + item.price * (steps[item.id] ?? 0), 0),
      ref: { kind: 'box', size: size.id, steps: orderedSteps },
    });
    setSteps({});
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {catalog.cutoffPassed && (
        <div className="notice soft">
          Ya pasaron las {catalog.cutoffPassed}: en la web los rolls y nigiris están cortados. Sumalos solo si la cocina llega.
        </div>
      )}
      <div className="inline">
        <div className="choices" role="group" aria-label="Tamaño de la caja">
          {sizes.map((candidate) => (
            <button key={candidate.id} className="choice" aria-pressed={candidate.id === sizeId} onClick={() => setSizeId(candidate.id)}>
              {candidate.name}
            </button>
          ))}
        </div>
        {size && <span className="muted small">Entra: {size.fits.join(' · ')}</span>}
      </div>
      <table>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className={item.soldOut ? 'off' : undefined}>
              <td>
                <span className="name">{item.name}</span>
                {item.soldOut && sold}
                <span className="detail-line num">
                  {formatPrice(item.price)} {item.step > 1 ? `cada ${item.step}` : 'c/u'}
                </span>
              </td>
              <td className="actions">
                <span className="stepper">
                  <button className="btn sm icon-only" aria-label={`Sacar ${item.name}`} disabled={!steps[item.id]} onClick={() => change(item.id, -1)}>
                    <Icon name="minus" size="sm" />
                  </button>
                  <span className="value">{item.step * (steps[item.id] ?? 0)}</span>
                  <button className="btn sm icon-only" aria-label={`Sumar ${item.name}`} disabled={item.soldOut} onClick={() => change(item.id, 1)}>
                    <Icon name="plus" size="sm" />
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="inline">
        <span className="num" style={{ flex: 1 }}>
          {rollPieces} piezas + {nigiris} nigiris
          {chosen.length > 0 && !valid && <span className="error"> · no es una combinación de esta caja</span>}
        </span>
        <button className="btn primary" disabled={!valid || hasSoldOut} onClick={add}>
          <Icon name="plus" size="sm" />
          Sumar caja
        </button>
      </div>
    </div>
  );
}

interface NewOrderProps {
  /** Kept mounted while hidden, so answering another order doesn't lose what was being loaded */
  visible: boolean;
  onCreated: (order: StaffOrder) => void;
  onCancel: () => void;
}

/** An order that came by WhatsApp, loaded by hand. It's saved as "nuevo": time, message and comanda follow as with any other. */
export function NewOrder({ visible, onCreated, onCancel }: NewOrderProps) {
  const [catalog, setCatalog] = useState<StaffCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>(BOX_TAB);
  const [lines, setLines] = useState<DraftLine[]>([]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [delivery, setDelivery] = useState<ManualOrderInput['deliveryMethod']>(null);
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState<ManualOrderInput['paymentMethod']>(null);
  const [notes, setNotes] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [code, setCode] = useState('');

  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Asked again each time the panel opens: sold-out marks may have changed
  useEffect(() => {
    if (!visible) return;
    void window.ensushi.api('GET', '/api/local/catalogo').then((response) => {
      if (response.status === 200) {
        setCatalog(response.data as StaffCatalog);
        setCatalogError(null);
      } else setCatalogError(errorOf(response, 'No se pudo cargar el menú.'));
    });
  }, [visible]);

  const items = useMemo(() => lines.map((line) => ({ ...line.ref, quantity: line.quantity })), [lines]);

  // The total comes from the server, with the same discounts and delivery fee the order will have
  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let stale = false;
    const timer = window.setTimeout(() => {
      void window.ensushi.api('POST', '/api/local/pedidos/presupuesto', { items, deliveryMethod: delivery, discountCode: code }).then((response) => {
        if (stale) return;
        if (response.status === 200) {
          setQuote(response.data as OrderQuote);
          setQuoteError(null);
        } else {
          setQuote(null);
          setQuoteError(errorOf(response, 'No se pudo calcular el total.'));
        }
      });
    }, 250);
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [items, delivery, code]);

  const addLine = (line: Omit<DraftLine, 'quantity'>) =>
    setLines((prev) =>
      prev.some((other) => other.key === line.key)
        ? prev.map((other) => (other.key === line.key ? { ...other, quantity: other.quantity + 1 } : other))
        : [...prev, { ...line, quantity: 1 }],
    );

  const changeQuantity = (key: string, delta: number) =>
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, quantity: line.quantity + delta } : line)).filter((line) => line.quantity > 0));

  const missing = [
    lines.length === 0 && 'algo para pedir',
    name.trim().length < 2 && 'nombre',
    !phone.trim() && 'celular',
    !delivery && 'entrega',
    delivery === 'delivery' && address.trim().length < 5 && 'dirección',
    !payment && 'pago',
  ].filter((part): part is string => Boolean(part));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    const input: ManualOrderInput = { name, phone, deliveryMethod: delivery, address, paymentMethod: payment, notes, discountCode: code, items };
    const response = await window.ensushi.api('POST', '/api/local/pedidos', input);
    setSaving(false);
    if (response.status === 201) onCreated(response.data as StaffOrder);
    else setSaveError(errorOf(response, 'No se pudo guardar el pedido.'));
  };

  if (!catalog) {
    return (
      <div className="page">
        <p className={catalogError ? 'error' : 'muted'}>{catalogError ?? 'Cargando…'}</p>
      </div>
    );
  }

  const group = catalog.groups.find((candidate) => candidate.name === tab);

  return (
    <div className="page" style={{ maxWidth: 1240 }}>
      <div className="page-head">
        <div>
          <h1>Nuevo pedido</h1>
          <p className="muted">Para los que piden por WhatsApp. Después de guardarlo le ponés la hora y se confirma como cualquier otro.</p>
        </div>
      </div>
      <div className="new-order">
        <section className="block">
          <div className="choices" role="group" aria-label="Sección del menú">
            <button className="choice" aria-pressed={tab === BOX_TAB} onClick={() => setTab(BOX_TAB)}>
              {catalog.box.name}
            </button>
            {catalog.groups.map((candidate) => (
              <button key={candidate.name} className="choice" aria-pressed={tab === candidate.name} onClick={() => setTab(candidate.name)}>
                {candidate.name}
              </button>
            ))}
          </div>

          {tab === BOX_TAB && <BoxBuilder catalog={catalog} onAdd={addLine} />}
          {group && (
            <table>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.id} className={item.soldOut ? 'off' : undefined}>
                    <td>
                      <span className="name">{item.name}</span>
                      {item.soldOut && sold}
                    </td>
                    <td className="actions">
                      <span className="inline">
                        {item.choices.map((choice) => (
                          <button
                            key={choice.label ?? 'unica'}
                            className="btn sm num"
                            disabled={item.soldOut}
                            onClick={() =>
                              addLine({
                                key: JSON.stringify(choice.line),
                                name: choice.label ? `${item.name} · ${choice.label}` : item.name,
                                detail: null,
                                unitPrice: choice.price,
                                ref: choice.line,
                              })
                            }
                          >
                            {choice.label ? `${choice.label} · ` : <Icon name="plus" size="xs" />}
                            {formatPrice(choice.price)}
                          </button>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div style={{ display: 'grid', gap: 20 }}>
          <section className="block">
            <h2>Pedido</h2>
            {lines.length === 0 ? (
              <p className="muted">Todavía no sumaste nada.</p>
            ) : (
              <table className="lines">
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key}>
                      <td className="name">
                        {line.name}
                        {line.detail && <span className="detail-line">{line.detail}</span>}
                        <span className="stepper" style={{ marginTop: 6 }}>
                          <button className="btn sm icon-only" aria-label={`Sacar uno de ${line.name}`} onClick={() => changeQuantity(line.key, -1)}>
                            <Icon name="minus" size="sm" />
                          </button>
                          <span className="value">{line.quantity}</span>
                          <button className="btn sm icon-only" aria-label={`Sumar uno de ${line.name}`} onClick={() => changeQuantity(line.key, 1)}>
                            <Icon name="plus" size="sm" />
                          </button>
                        </span>
                      </td>
                      <td className="amt">{formatPrice(line.unitPrice * line.quantity)}</td>
                    </tr>
                  ))}
                  {quote && quote.discountAmount > 0 && (
                    <tr className="sub">
                      <td>Descuento ({quote.discountLabel})</td>
                      <td className="amt kin">−{formatPrice(quote.discountAmount)}</td>
                    </tr>
                  )}
                  {quote && quote.deliveryFee > 0 && (
                    <tr className="sub">
                      <td>Envío</td>
                      <td className="amt">{formatPrice(quote.deliveryFee)}</td>
                    </tr>
                  )}
                  <tr className="total">
                    <td>Total</td>
                    <td className="amt">{quote ? formatPrice(quote.total) : '—'}</td>
                  </tr>
                </tbody>
              </table>
            )}
            {quoteError && <p className="error">{quoteError}</p>}
          </section>

          <section className="block">
            <h2>Cliente</h2>
            <div className="field">
              <label htmlFor="manual-name">Nombre</label>
              <input id="manual-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="manual-phone">Celular (el del WhatsApp)</label>
              <input id="manual-phone" inputMode="tel" className="num" placeholder="2478 567168" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field">
              <span className="label">Entrega</span>
              <div className="choices" role="group" aria-label="Entrega">
                {(['pickup', 'delivery'] as const).map((method) => (
                  <button key={method} className="choice" aria-pressed={delivery === method} onClick={() => setDelivery(method)}>
                    <Icon name={method === 'delivery' ? 'bike' : 'bag'} size="sm" />
                    {DELIVERY_LABELS[method]}
                  </button>
                ))}
              </div>
            </div>
            {delivery === 'delivery' && (
              <div className="field">
                <label htmlFor="manual-address">Dirección</label>
                <input id="manual-address" maxLength={160} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            )}
            <div className="field">
              <span className="label">Pago</span>
              <div className="choices" role="group" aria-label="Pago">
                {(['cash', 'transfer', 'mixed'] as const).map((method) => (
                  <button key={method} className="choice" aria-pressed={payment === method} onClick={() => setPayment(method)}>
                    {PAYMENT_LABELS[method]}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="manual-notes">Observaciones (opcional)</label>
              <input id="manual-notes" maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="manual-code">Código de descuento (opcional)</label>
              {code ? (
                <div className="inline">
                  <span className="tag confirmado">{code}</span>
                  <button
                    className="btn sm"
                    onClick={() => {
                      setCode('');
                      setCodeInput('');
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <div className="inline nowrap">
                  <input id="manual-code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} />
                  <button className="btn" disabled={!codeInput.trim()} onClick={() => setCode(codeInput.trim())}>
                    Aplicar
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <button className="btn primary" style={{ minHeight: 52 }} disabled={missing.length > 0 || !quote || saving} onClick={() => void save()}>
                {saving ? 'Guardando…' : quote ? `Guardar pedido · ${formatPrice(quote.total)}` : 'Guardar pedido'}
              </button>
              {missing.length > 0 && <p className="muted small">Falta: {missing.join(', ')}.</p>}
              {saveError && <p className="error">{saveError}</p>}
              <button className="btn ghost" onClick={onCancel}>
                Empezar de nuevo
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
