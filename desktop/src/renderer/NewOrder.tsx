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

const sold = <span className="tag rechazado">Agotado hoy</span>;

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
    <div>
      {catalog.cutoffPassed && (
        <p className="notes">Ya pasaron las {catalog.cutoffPassed}: en la web los rolls y nigiris están cortados. Sumalos solo si la cocina llega.</p>
      )}
      <div className="row">
        {sizes.map((candidate) => (
          <button key={candidate.id} className={candidate.id === sizeId ? 'primary' : undefined} onClick={() => setSizeId(candidate.id)}>
            {candidate.name}
          </button>
        ))}
      </div>
      {size && <p className="muted" style={{ margin: '8px 0' }}>Entra: {size.fits.join(' · ')}</p>}
      <table>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderTop: '1px solid #ddd', opacity: item.soldOut ? 0.6 : 1 }}>
              <td style={{ padding: '6px 0' }}>
                {item.name} {item.soldOut && sold}
                <div className="muted" style={{ fontSize: 14 }}>
                  {formatPrice(item.price)} {item.step > 1 ? `cada ${item.step}` : 'c/u'}
                </div>
              </td>
              <td className="num" style={{ padding: '6px 0' }}>
                <span className="row" style={{ justifyContent: 'flex-end' }}>
                  <button aria-label={`Sacar ${item.name}`} disabled={!steps[item.id]} onClick={() => change(item.id, -1)}>−</button>
                  <span style={{ minWidth: 28, textAlign: 'center' }}>{item.step * (steps[item.id] ?? 0)}</span>
                  <button aria-label={`Sumar ${item.name}`} disabled={item.soldOut} onClick={() => change(item.id, 1)}>+</button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="row" style={{ marginBottom: 0 }}>
        <span style={{ flex: 1 }}>
          {rollPieces} piezas + {nigiris} nigiris
          {chosen.length > 0 && !valid && <strong className="error"> · no es una combinación de esta caja</strong>}
        </span>
        <button className="primary" disabled={!valid || hasSoldOut} onClick={add}>
          Sumar caja
        </button>
      </p>
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

  if (!catalog) return <p className={catalogError ? 'error' : 'muted'}>{catalogError ?? 'Cargando…'}</p>;

  const group = catalog.groups.find((candidate) => candidate.name === tab);

  return (
    <div>
      <h1 style={{ margin: '0 0 4px' }}>Nuevo pedido</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Para los que piden por WhatsApp. Después de guardarlo le ponés la hora y se confirma como cualquier otro.
      </p>
      <div className="new-order">
        <div className="panel">
          <div className="row" style={{ marginBottom: 12 }}>
            <button className={tab === BOX_TAB ? 'primary' : undefined} onClick={() => setTab(BOX_TAB)}>
              {catalog.box.name}
            </button>
            {catalog.groups.map((candidate) => (
              <button key={candidate.name} className={tab === candidate.name ? 'primary' : undefined} onClick={() => setTab(candidate.name)}>
                {candidate.name}
              </button>
            ))}
          </div>

          {tab === BOX_TAB && <BoxBuilder catalog={catalog} onAdd={addLine} />}
          {group && (
            <table>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.id} style={{ borderTop: '1px solid #ddd', opacity: item.soldOut ? 0.6 : 1 }}>
                    <td style={{ padding: '6px 8px 6px 0' }}>
                      {item.name} {item.soldOut && sold}
                    </td>
                    <td className="num" style={{ padding: '6px 0' }}>
                      <span className="row" style={{ justifyContent: 'flex-end' }}>
                        {item.choices.map((choice) => (
                          <button
                            key={choice.label ?? 'unica'}
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
                            {choice.label ? `${choice.label} · ` : '+ '}
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
        </div>

        <div>
          <div className="panel">
            <strong>Pedido</strong>
            {lines.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>Todavía no sumaste nada.</p>
            ) : (
              <table style={{ marginTop: 6 }}>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.key} style={{ borderTop: '1px solid #ddd' }}>
                      <td style={{ padding: '6px 8px 6px 0' }}>
                        {line.name}
                        {line.detail && <div className="muted" style={{ fontSize: 14 }}>{line.detail}</div>}
                        <div className="row" style={{ marginTop: 4 }}>
                          <button aria-label={`Sacar uno de ${line.name}`} onClick={() => changeQuantity(line.key, -1)}>−</button>
                          <span>{line.quantity}</span>
                          <button aria-label={`Sumar uno de ${line.name}`} onClick={() => changeQuantity(line.key, 1)}>+</button>
                        </div>
                      </td>
                      <td className="num" style={{ padding: '6px 0' }}>{formatPrice(line.unitPrice * line.quantity)}</td>
                    </tr>
                  ))}
                  {quote && quote.discountAmount > 0 && (
                    <tr style={{ borderTop: '1px solid #ddd' }}>
                      <td>Descuento ({quote.discountLabel})</td>
                      <td className="num">-{formatPrice(quote.discountAmount)}</td>
                    </tr>
                  )}
                  {quote && quote.deliveryFee > 0 && (
                    <tr>
                      <td>Envío</td>
                      <td className="num">{formatPrice(quote.deliveryFee)}</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: '1px solid #ddd' }}>
                    <td><strong>Total</strong></td>
                    <td className="num"><strong>{quote ? formatPrice(quote.total) : '—'}</strong></td>
                  </tr>
                </tbody>
              </table>
            )}
            {quoteError && <p className="error" style={{ marginBottom: 0 }}>{quoteError}</p>}
          </div>

          <div className="panel">
            <label htmlFor="manual-name" style={{ marginTop: 0 }}>Nombre</label>
            <input id="manual-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />

            <label htmlFor="manual-phone">Celular (el del WhatsApp)</label>
            <input id="manual-phone" inputMode="tel" placeholder="2478 567168" value={phone} onChange={(e) => setPhone(e.target.value)} />

            <label>Entrega</label>
            <div className="row">
              {(['pickup', 'delivery'] as const).map((method) => (
                <button key={method} className={delivery === method ? 'primary' : undefined} onClick={() => setDelivery(method)}>
                  {DELIVERY_LABELS[method]}
                </button>
              ))}
            </div>
            {delivery === 'delivery' && (
              <>
                <label htmlFor="manual-address">Dirección</label>
                <input id="manual-address" maxLength={160} value={address} onChange={(e) => setAddress(e.target.value)} />
              </>
            )}

            <label>Pago</label>
            <div className="row">
              {(['cash', 'transfer', 'mixed'] as const).map((method) => (
                <button key={method} className={payment === method ? 'primary' : undefined} onClick={() => setPayment(method)}>
                  {PAYMENT_LABELS[method]}
                </button>
              ))}
            </div>

            <label htmlFor="manual-notes">Observaciones (opcional)</label>
            <input id="manual-notes" maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} />

            <label htmlFor="manual-code">Código de descuento (opcional)</label>
            {code ? (
              <div className="row">
                <strong>{code}</strong>
                <button onClick={() => { setCode(''); setCodeInput(''); }}>Quitar</button>
              </div>
            ) : (
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input id="manual-code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} />
                <button disabled={!codeInput.trim()} onClick={() => setCode(codeInput.trim())}>Aplicar</button>
              </div>
            )}

            <p className="row" style={{ marginBottom: 0 }}>
              <button className="primary" disabled={missing.length > 0 || !quote || saving} onClick={() => void save()}>
                {saving ? 'Guardando…' : quote ? `Guardar pedido · ${formatPrice(quote.total)}` : 'Guardar pedido'}
              </button>
              <button onClick={onCancel}>Empezar de nuevo</button>
            </p>
            {missing.length > 0 && <p className="muted" style={{ marginBottom: 0 }}>Falta: {missing.join(', ')}.</p>}
            {saveError && <p className="error" style={{ marginBottom: 0 }}>{saveError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
