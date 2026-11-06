import { useEffect, useState } from 'react';

import type { StaffOrder } from '../../../src/types/pedidos';
import { formatPrice } from '../shared/textos';
import { formatDay, salesByProduct, summarizeSales, today } from '../shared/ventas';

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

  return (
    <div style={{ maxWidth: 820 }}>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Ventas</h2>
        <div className="row">
          <button onClick={() => setPeriod([today(), today()])}>Hoy</button>
          <button onClick={() => setPeriod(monthOf(today(), 0))}>Este mes</button>
          <button onClick={() => setPeriod(monthOf(today(), 1))}>Mes pasado</button>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <label htmlFor="from" style={{ margin: 0 }}>
            Desde
          </label>
          <input id="from" type="date" style={{ width: 170 }} value={from} onChange={(e) => setFrom(e.target.value)} />
          <label htmlFor="to" style={{ margin: 0 }}>
            Hasta
          </label>
          <input id="to" type="date" style={{ width: 170 }} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        {summary && (
          <>
            <p className="muted">
              Del {formatDay(from)} al {formatDay(to)} · solo pedidos confirmados
            </p>
            <div className="stats">
              <div>
                Pedidos <strong>{summary.orders}</strong>
              </div>
              <div>
                Total vendido <strong>{formatPrice(summary.total)}</strong>
              </div>
              <div>
                Efectivo <strong>{formatPrice(summary.cash)}</strong>
              </div>
              <div>
                Transferencia <strong>{formatPrice(summary.transfer)}</strong>
              </div>
            </div>
            {summary.unsplitOrders > 0 && (
              <p className="error">
                {summary.unsplitOrders === 1 ? '1 pedido mixto' : `${summary.unsplitOrders} pedidos mixtos`} sin cargar el cobro (
                {formatPrice(summary.unsplitTotal)}): no suman en efectivo ni en transferencia hasta que lo cargues en el pedido.
              </p>
            )}
          </>
        )}

        <p className="row">
          <button className="primary" disabled={!orders || orders.length === 0 || exporting} onClick={() => void exportExcel()}>
            {exporting ? 'Guardando…' : 'Exportar a Excel'}
          </button>
          {orders?.length === 0 && <span className="muted">No hay pedidos confirmados en esas fechas.</span>}
          {notice && (
            <>
              <span>Listo, guardado.</span>
              <button onClick={() => void window.ensushi.openLastExport()}>Abrir</button>
            </>
          )}
        </p>
        {error && <p className="error">{error}</p>}
      </div>

      {products.length > 0 && (
        <div className="panel">
          <strong>Lo más vendido</strong> <span className="muted">· antes de descuentos; la lista completa va en el Excel</span>
          <table style={{ marginTop: 8 }}>
            <tbody>
              {products.map((product) => (
                <tr key={product.name}>
                  <td>
                    {product.quantity}x {product.name}
                  </td>
                  <td className="num">{formatPrice(product.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
