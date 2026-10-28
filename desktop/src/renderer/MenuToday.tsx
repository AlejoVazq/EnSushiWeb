import { useState } from 'react';

import type { StaffMenu, StaffMenuAction } from '../../../src/types/pedidos';
import type { ApiResponse } from '../shared/bridge';

const errorOf = (response: ApiResponse, fallback: string): string => {
  const { data } = response;
  return typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : fallback;
};

/** "2026-10-30" → "30/10" */
const formatDay = (day: string): string => day.split('-').slice(1).reverse().join('/');

/** A change for today; answers with the whole menu as the server sees it, or an error */
export const changeMenu = async (action: StaffMenuAction): Promise<{ ok: true; menu: StaffMenu } | { ok: false; error: string }> => {
  const response = await window.ensushi.api('PATCH', '/api/local/menu', action);
  return response.status === 200 ? { ok: true, menu: response.data as StaffMenu } : { ok: false, error: errorOf(response, 'No se pudo cambiar.') };
};

interface MenuTodayProps {
  /** null while loading */
  menu: StaffMenu | null;
  loadError: string | null;
  onChange: (menu: StaffMenu) => void;
}

/** Today's sold-out items and pausing orders. Everything goes back to normal the next day on its own. */
export function MenuToday({ menu, loadError, onChange }: MenuTodayProps) {
  const [error, setError] = useState<string | null>(null);
  /** The item (or 'pause') being saved, so its button can't be pressed twice */
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmPause, setConfirmPause] = useState(false);

  const apply = async (key: string, action: StaffMenuAction) => {
    setBusy(key);
    setError(null);
    const result = await changeMenu(action);
    setBusy(null);
    if (result.ok) onChange(result.menu);
    else setError(result.error);
  };

  if (!menu) return <p className={loadError ? 'error' : 'muted'}>{loadError ?? 'Cargando…'}</p>;

  const soldOutCount = menu.groups.reduce((sum, group) => sum + group.items.filter((item) => item.soldOut && !item.locked).length, 0);

  return (
    <div>
      <h1 style={{ margin: '0 0 4px' }}>Menú de hoy ({formatDay(menu.day)})</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Lo que cambies acá se ve en la web en menos de un minuto y vuelve a la normalidad mañana solo.
      </p>

      <div className="panel" style={menu.ordersPaused ? { borderColor: '#b00', background: '#fdecec' } : undefined}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <strong>{menu.ordersPaused ? 'Pedidos pausados por hoy' : 'Tomando pedidos'}</strong>
            <div className="muted" style={{ fontSize: 14 }}>
              {menu.ordersPaused
                ? 'La web dice "Por hoy no tomamos más pedidos" y no deja mandar. Los que ya llegaron siguen acá.'
                : 'Si la cocina no da más, pausalos: la web deja de aceptar pedidos hasta que los reanudes (o hasta mañana).'}
            </div>
          </div>
          {menu.ordersPaused ? (
            <button className="primary" disabled={busy === 'pause'} onClick={() => void apply('pause', { ordersPaused: false })}>
              Reanudar pedidos
            </button>
          ) : confirmPause ? (
            <span className="row">
              ¿Pausar por hoy?
              <button
                className="danger"
                disabled={busy === 'pause'}
                onClick={() => {
                  setConfirmPause(false);
                  void apply('pause', { ordersPaused: true });
                }}
              >
                Sí, pausar
              </button>
              <button onClick={() => setConfirmPause(false)}>No</button>
            </span>
          ) : (
            <button className="danger" onClick={() => setConfirmPause(true)}>
              Pausar pedidos
            </button>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <p className="muted">
        {soldOutCount === 0 ? 'Nada agotado hoy.' : `${soldOutCount} ${soldOutCount === 1 ? 'cosa agotada' : 'cosas agotadas'} hoy.`} Lo
        agotado se ve desteñido en la web y no se puede pedir; si alguien ya lo tenía en el carrito, tiene que sacarlo.
      </p>

      {menu.groups.map((group) => (
        <div key={group.name} className="panel">
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>{group.name}</h2>
          <table>
            <tbody>
              {group.items.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid #ddd' }}>
                  <td style={{ padding: '6px 0', opacity: item.soldOut ? 0.6 : 1 }}>
                    {item.name}
                    {item.soldOut && <span className="tag rechazado" style={{ marginLeft: 8 }}>Agotado hoy</span>}
                  </td>
                  <td className="num" style={{ padding: '6px 0' }}>
                    {item.locked ? (
                      <span className="muted" style={{ fontSize: 14 }}>Apagado en el código de la web</span>
                    ) : (
                      <button
                        className={item.soldOut ? 'primary' : undefined}
                        disabled={busy === item.id}
                        onClick={() => void apply(item.id, { itemId: item.id, soldOut: !item.soldOut })}
                      >
                        {item.soldOut ? 'Volvió a haber' : 'Marcar agotado'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
