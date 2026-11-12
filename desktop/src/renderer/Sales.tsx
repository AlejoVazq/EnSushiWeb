import { useEffect, useState } from 'react';

import type { StaffOrder } from '../../../src/types/pedidos';
import { formatPrice } from '../shared/textos';
import { formatDay, salesByProduct, summarizeSales, today } from '../shared/ventas';

import { Icon } from './ui';

const errorText = (data: unknown): string =>
  typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : 'Error del servidor.';

/** "2026-10-30" → first and last day of that month, or of the month before */
const monthOf = (day: string, monthsBack: number): [string, string] => {
  const [year = 0, month = 1] = day.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1 - monthsBack, 1));
  const last = new Date(Date.UTC(year, month - monthsBack, 0));
  return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)];
};

/** The confirmed orders of a period: totals on screen, everything in an Excel file */
export function Sales() {
  const [from, setFrom] = useState(() => monthOf(today(), 0)[0]);
  const [to, setTo] = useState(today);
  const [orders, setOrders] = useState<StaffOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    void (async () => {
      const response = await window.ensushi.api('GET', `/api/local/ventas?desde=${from}&hasta=${to}`);
      if (cancelled) return;
      if (response.status === 200 && Array.isArray(response.data)) {
        setOrders(response.data as StaffOrder[]);
        setError(null);
      } else {
        setOrders(null);
        setError(errorText(response.data));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const setPeriod = ([start, end]: [string, string]) => {
    setFrom(start);
    setTo(end);
    setNotice(null);
  };

  const exportExcel = async () => {
    if (!orders) return;
    setExporting(true);
    setNotice(null);
    const result = await window.ensushi.exportSales(orders, from, to);
    setExporting(false);
    if (result.ok) setNotice('saved');
    else if (!result.canceled) setError(result.error);
  };

  const summary = orders ? summarizeSales(orders) : null;
  const products = orders ? salesByProduct(orders).slice(0, 10) : [];

  const isPeriod = ([start, end]: [string, string]) => from === start && to === end;
  const periods: { label: string; range: [string, string] }[] = [
    { label: 'Hoy', range: [today(), today()] },
    { label: 'Este mes', range: [monthOf(today(), 0)[0], today()] },
    { label: 'Mes pasado', range: monthOf(today(), 1) },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Ventas</h1>
          <p className="muted">Solo pedidos confirmados. Todo el detalle va en el Excel.</p>
        </div>
        <div className="end inline">
          {notice && (
            <>
              <span className="ok small">Listo, guardado.</span>
              <button className="btn sm" onClick={() => void window.ensushi.openLastExport()}>
                Abrir
              </button>
            </>
          )}
          <button className="btn primary" disabled={!orders || orders.length === 0 || exporting} onClick={() => void exportExcel()}>
            <Icon name="download" size="sm" />
            {exporting ? 'Guardando…' : 'Exportar a Excel'}
          </button>
        </div>
      </div>

      <div className="inline" style={{ gap: 12 }}>
        <div className="choices" role="group" aria-label="Período">
          {periods.map((period) => (
            <button key={period.label} className="choice" aria-pressed={isPeriod(period.range)} onClick={() => setPeriod(period.range)}>
              {period.label}
            </button>
          ))}
        </div>
        <span className="inline" style={{ marginLeft: 'auto' }}>
          <label htmlFor="from" className="label">
            Desde
          </label>
          <input id="from" type="date" className="w-md" value={from} onChange={(e) => setFrom(e.target.value)} />
          <label htmlFor="to" className="label">
            Hasta
          </label>
          <input id="to" type="date" className="w-md" value={to} onChange={(e) => setTo(e.target.value)} />
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      {summary && (
        <section style={{ display: 'grid', gap: 10 }}>
          <p className="muted small num">
            Del {formatDay(from)} al {formatDay(to)}
          </p>
          <dl className="figures" style={{ margin: 0 }}>
            <div>
              <dt>Pedidos</dt>
              <dd>{summary.orders}</dd>
            </div>
            <div>
              <dt>Total vendido</dt>
              <dd>{formatPrice(summary.total)}</dd>
            </div>
            <div>
              <dt>Efectivo</dt>
              <dd>{formatPrice(summary.cash)}</dd>
            </div>
            <div>
              <dt>Transferencia</dt>
              <dd>{formatPrice(summary.transfer)}</dd>
            </div>
          </dl>
          {summary.unsplitOrders > 0 && (
            <p className="error">
              {summary.unsplitOrders === 1 ? '1 pedido mixto' : `${summary.unsplitOrders} pedidos mixtos`} sin cargar el cobro (
              {formatPrice(summary.unsplitTotal)}): no suman en efectivo ni en transferencia hasta que lo cargues en el pedido.
            </p>
          )}
          {orders?.length === 0 && <p className="muted">No hay pedidos confirmados en esas fechas.</p>}
        </section>
      )}

      {products.length > 0 && (
        <section className="block">
          <div className="block-head">
            <h2>Lo más vendido</h2>
            <span className="muted small">antes de descuentos; la lista completa va en el Excel</span>
          </div>
          <table>
            <tbody>
              {products.map((product) => (
                <tr key={product.name}>
                  <td className="num" style={{ width: 56, fontFamily: 'var(--display)', fontWeight: 700 }}>
                    {product.quantity}×
                  </td>
                  <td className="name">{product.name}</td>
                  <td className="amt">{formatPrice(product.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
