import { useCallback, useEffect, useState } from 'react';

import type { StaffDiscountCode, StaffDiscountCodeInput } from '../../../src/types/pedidos';
import type { ApiResponse } from '../shared/bridge';
import { formatPrice } from '../shared/textos';

import { Icon } from './ui';

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
    <section className="block" style={{ gap: 18 }}>
      <h2>{editing ? `Editar ${editing.code}` : 'Código nuevo'}</h2>

      <div className="field">
        <label htmlFor="code">Código</label>
        <input
          id="code"
          className="w-md"
          value={draft.code}
          disabled={editing !== null}
          placeholder="VERANO10"
          style={{ textTransform: 'uppercase', width: 260 }}
          onChange={(e) => set('code', e.target.value)}
        />
        <span className="hint">Letras, números o guiones. El cliente lo escribe en el checkout (mayúsculas o minúsculas da igual).</span>
      </div>

      <div className="field">
        <span className="label">Descuento</span>
        <div className="inline">
          <div className="seg" role="group" aria-label="Tipo de descuento">
            <button aria-pressed={draft.kind === 'percent'} onClick={() => set('kind', 'percent')}>
              Porcentaje (%)
            </button>
            <button aria-pressed={draft.kind === 'amount'} onClick={() => set('kind', 'amount')}>
              Monto fijo ($)
            </button>
          </div>
          <input
            aria-label={draft.kind === 'percent' ? 'Porcentaje' : 'Monto en pesos'}
            inputMode="numeric"
            className="w-sm num"
            value={draft.value}
            placeholder={draft.kind === 'percent' ? '10' : '2000'}
            onChange={(e) => set('value', e.target.value.replace(/\D/g, ''))}
          />
          <span className="muted">{draft.kind === 'percent' ? '% sobre el pedido' : 'pesos menos en el pedido'}</span>
        </div>
        <span className="hint">Nunca descuenta el envío. Si ese día hay un descuento especial que ahorra más, se aplica ese (no se suman).</span>
      </div>

      <div className="inline" style={{ gap: 16, alignItems: 'flex-start' }}>
        <div className="field">
          <label htmlFor="from">Desde (opcional)</label>
          <input id="from" type="date" className="w-md" value={draft.validFrom} onChange={(e) => set('validFrom', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="until">Hasta (opcional, incluido)</label>
          <input id="until" type="date" className="w-md" value={draft.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="max">Usos en total</label>
          <input
            id="max"
            inputMode="numeric"
            className="w-sm num"
            placeholder="sin límite"
            value={draft.maxUses}
            onChange={(e) => set('maxUses', e.target.value.replace(/\D/g, ''))}
          />
        </div>
      </div>

      <div className="field">
        <label className="check">
          <input type="checkbox" checked={draft.oncePerCustomer} onChange={(e) => set('oncePerCustomer', e.target.checked)} />
          Una sola vez por cliente
        </label>
        <span className="hint">Los pedidos rechazados no cuentan como uso.</span>
      </div>

      {error && <p className="error">{error}</p>}
      <div className="inline">
        <button className="btn primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button className="btn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </section>
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
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Códigos de descuento</h1>
          <p className="muted">Los que crees acá funcionan en la web apenas los guardás.</p>
        </div>
        {form === null && (
          <button className="btn primary end" onClick={() => setForm('new')}>
            <Icon name="plus" size="sm" />
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
      {codes?.length === 0 && form === null && <p className="muted">Todavía no hay códigos.</p>}

      {codes && codes.length > 0 && (
        <table>
          <thead>
            <tr>
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
              <tr key={code.code} className={code.active ? undefined : 'off'}>
                <td>
                  <span className="name">{code.code}</span>
                  {code.oncePerCustomer && <span className="detail-line">Una vez por cliente</span>}
                </td>
                <td className="num">{describeValue(code)}</td>
                <td className="num">{describeDates(code)}</td>
                <td className="num">{code.maxUses === null ? code.uses : `${code.uses} de ${code.maxUses}`}</td>
                <td>{code.active ? <span className="tag confirmado">Activo</span> : <span className="tag rechazado">Pausado</span>}</td>
                <td className="actions">
                  {confirmDelete === code.code ? (
                    <span className="inline">
                      ¿Borrarlo?
                      <button className="btn sm danger" onClick={() => void remove(code.code)}>
                        Sí, borrar
                      </button>
                      <button className="btn sm" onClick={() => setConfirmDelete(null)}>
                        No
                      </button>
                    </span>
                  ) : (
                    <span className="inline">
                      <button className="btn sm" onClick={() => void toggle(code)}>
                        {code.active ? 'Pausar' : 'Activar'}
                      </button>
                      <button className="btn sm" onClick={() => setForm(code)}>
                        Editar
                      </button>
                      <button className="btn sm ghost" style={{ color: 'var(--error)' }} onClick={() => setConfirmDelete(code.code)}>
                        Borrar
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
