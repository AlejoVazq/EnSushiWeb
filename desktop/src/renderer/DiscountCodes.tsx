import { useCallback, useEffect, useState } from 'react';

import type { StaffDiscountCode, StaffDiscountCodeInput } from '../../../src/types/pedidos';
import type { ApiResponse } from '../shared/bridge';
import { formatPrice } from '../shared/textos';

const errorOf = (response: ApiResponse, fallback: string): string => {
  const { data } = response;
  return typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : fallback;
};

/** "10%" / "$ 2.000" */
const describeValue = (code: Pick<StaffDiscountCode, 'kind' | 'value'>): string =>
  code.kind === 'percent' ? `${code.value}%` : formatPrice(code.value);

/** "2026-12-31" → "31/12/2026" */
const formatDay = (day: string): string => day.split('-').reverse().join('/');

const describeDates = ({ validFrom, validUntil }: StaffDiscountCode): string => {
  if (validFrom && validUntil) return `Del ${formatDay(validFrom)} al ${formatDay(validUntil)}`;
  if (validFrom) return `Desde el ${formatDay(validFrom)}`;
  if (validUntil) return `Hasta el ${formatDay(validUntil)}`;
  return 'Sin fecha';
};

interface Draft {
  code: string;
  kind: 'percent' | 'amount';
  /** As typed: the inputs are text until saved */
  value: string;
  validFrom: string;
  validUntil: string;
  maxUses: string;
  oncePerCustomer: boolean;
  active: boolean;
}

const EMPTY_DRAFT: Draft = {
  code: '',
  kind: 'percent',
  value: '',
  validFrom: '',
  validUntil: '',
  maxUses: '',
  oncePerCustomer: false,
  active: true,
};

const toDraft = (code: StaffDiscountCode): Draft => ({
  code: code.code,
  kind: code.kind,
  value: String(code.value),
  validFrom: code.validFrom ?? '',
  validUntil: code.validUntil ?? '',
  maxUses: code.maxUses === null ? '' : String(code.maxUses),
  oncePerCustomer: code.oncePerCustomer,
  active: code.active,
});

const toInput = (draft: Draft): StaffDiscountCodeInput => ({
  code: draft.code.trim().toUpperCase(),
  kind: draft.kind,
  value: Number(draft.value),
  validFrom: draft.validFrom || null,
  validUntil: draft.validUntil || null,
  maxUses: draft.maxUses.trim() ? Number(draft.maxUses) : null,
  oncePerCustomer: draft.oncePerCustomer,
  active: draft.active,
});

interface CodeFormProps {
  /** The code being edited; null for a new one */
  editing: StaffDiscountCode | null;
  onSaved: (code: StaffDiscountCode) => void;
  onCancel: () => void;
}

function CodeForm({ editing, onSaved, onCancel }: CodeFormProps) {
  const [draft, setDraft] = useState<Draft>(editing ? toDraft(editing) : EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    const input = toInput(draft);
    const response = editing
      ? await window.ensushi.api('PATCH', `/api/local/codigos/${encodeURIComponent(editing.code)}`, input)
      : await window.ensushi.api('POST', '/api/local/codigos', input);
    setSaving(false);
    if (response.status === 200 || response.status === 201) onSaved(response.data as StaffDiscountCode);
    else setError(errorOf(response, 'No se pudo guardar.'));
  };

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>{editing ? `Editar ${editing.code}` : 'Código nuevo'}</h2>

      <label htmlFor="code">Código</label>
      <input
        id="code"
        value={draft.code}
        disabled={editing !== null}
        placeholder="VERANO10"
        style={{ textTransform: 'uppercase' }}
        onChange={(e) => set('code', e.target.value)}
      />
      <p className="muted">Letras, números o guiones. El cliente lo escribe en el checkout (mayúsculas o minúsculas da igual).</p>

      <label htmlFor="kind">Descuento</label>
      <div className="row">
        <select id="kind" style={{ width: 200 }} value={draft.kind} onChange={(e) => set('kind', e.target.value === 'amount' ? 'amount' : 'percent')}>
          <option value="percent">Porcentaje (%)</option>
          <option value="amount">Monto fijo ($)</option>
        </select>
        <input
          aria-label={draft.kind === 'percent' ? 'Porcentaje' : 'Monto en pesos'}
          inputMode="numeric"
          style={{ width: 140 }}
          value={draft.value}
          placeholder={draft.kind === 'percent' ? '10' : '2000'}
          onChange={(e) => set('value', e.target.value.replace(/\D/g, ''))}
        />
        <span className="muted">{draft.kind === 'percent' ? '% sobre el pedido' : 'pesos menos en el pedido'}</span>
      </div>
      <p className="muted">Nunca descuenta el envío. Si ese día hay un descuento especial que ahorra más, se aplica ese (no se suman).</p>

      <div className="row">
        <div style={{ flex: 1 }}>
          <label htmlFor="from">Desde (opcional)</label>
          <input id="from" type="date" value={draft.validFrom} onChange={(e) => set('validFrom', e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="until">Hasta (opcional, incluido)</label>
          <input id="until" type="date" value={draft.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
        </div>
      </div>

      <label htmlFor="max">Cantidad de usos en total (vacío = sin límite)</label>
      <input
        id="max"
        inputMode="numeric"
        style={{ width: 140 }}
        value={draft.maxUses}
        onChange={(e) => set('maxUses', e.target.value.replace(/\D/g, ''))}
      />

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400 }}>
        <input
          type="checkbox"
          style={{ width: 'auto' }}
          checked={draft.oncePerCustomer}
          onChange={(e) => set('oncePerCustomer', e.target.checked)}
        />
        Una sola vez por cliente
      </label>
      <p className="muted">Los pedidos rechazados no cuentan como uso.</p>

      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

/** Discount codes: create, edit, pause and delete. They work on the web as soon as they're saved. */
export function DiscountCodes() {
  const [codes, setCodes] = useState<StaffDiscountCode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** null: no form. 'new', or the code being edited */
  const [form, setForm] = useState<'new' | StaffDiscountCode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await window.ensushi.api('GET', '/api/local/codigos');
    if (response.status === 200 && Array.isArray(response.data)) {
      setCodes(response.data as StaffDiscountCode[]);
      setError(null);
    } else setError(errorOf(response, 'No se pudieron cargar los códigos.'));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const replace = (code: StaffDiscountCode) =>
    setCodes((prev) => {
      const list = prev ?? [];
      return list.some((c) => c.code === code.code) ? list.map((c) => (c.code === code.code ? code : c)) : [code, ...list];
    });

  const toggle = async (code: StaffDiscountCode) => {
    const response = await window.ensushi.api('PATCH', `/api/local/codigos/${encodeURIComponent(code.code)}`, { active: !code.active });
    if (response.status === 200) replace(response.data as StaffDiscountCode);
    else setError(errorOf(response, 'No se pudo cambiar.'));
  };

  const remove = async (code: string) => {
    const response = await window.ensushi.api('DELETE', `/api/local/codigos/${encodeURIComponent(code)}`);
    setConfirmDelete(null);
    if (response.status === 200) setCodes((prev) => (prev ?? []).filter((c) => c.code !== code));
    else setError(errorOf(response, 'No se pudo borrar.'));
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: '0 0 12px' }}>Códigos de descuento</h1>
        {form === null && (
          <button className="primary" onClick={() => setForm('new')}>
            Nuevo código
          </button>
        )}
      </div>

      {form !== null && (
        <CodeForm
          key={form === 'new' ? 'new' : form.code}
          editing={form === 'new' ? null : form}
          onSaved={(saved) => {
            replace(saved);
            setForm(null);
          }}
          onCancel={() => setForm(null)}
        />
      )}

      {error && <p className="error">{error}</p>}
      {codes === null && !error && <p className="muted">Cargando…</p>}
      {codes?.length === 0 && <p className="muted">Todavía no hay códigos. Los que crees acá funcionan en la web apenas los guardás.</p>}

      {codes && codes.length > 0 && (
        <div className="panel">
          <table>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th>Código</th>
                <th>Descuento</th>
                <th>Vigencia</th>
                <th>Usos</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => (
                <tr key={code.code} style={{ borderTop: '1px solid #ddd', opacity: code.active ? 1 : 0.6 }}>
                  <td>
                    <strong>{code.code}</strong>
                    {code.oncePerCustomer && <div className="muted" style={{ fontSize: 13 }}>Una vez por cliente</div>}
                  </td>
                  <td>{describeValue(code)}</td>
                  <td>{describeDates(code)}</td>
                  <td>{code.maxUses === null ? code.uses : `${code.uses} de ${code.maxUses}`}</td>
                  <td>{code.active ? 'Activo' : 'Pausado'}</td>
                  <td className="num">
                    {confirmDelete === code.code ? (
                      <span className="row" style={{ justifyContent: 'flex-end' }}>
                        ¿Borrarlo?
                        <button className="danger" onClick={() => void remove(code.code)}>
                          Sí, borrar
                        </button>
                        <button onClick={() => setConfirmDelete(null)}>No</button>
                      </span>
                    ) : (
                      <span className="row" style={{ justifyContent: 'flex-end' }}>
                        <button onClick={() => void toggle(code)}>{code.active ? 'Pausar' : 'Activar'}</button>
                        <button onClick={() => setForm(code)}>Editar</button>
                        <button className="danger" onClick={() => setConfirmDelete(code.code)}>
                          Borrar
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
