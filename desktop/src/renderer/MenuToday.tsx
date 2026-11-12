import { useState } from 'react';

import type { StaffMenu, StaffMenuAction } from '../../../src/types/pedidos';
import type { ApiResponse } from '../shared/bridge';

import { Icon } from './ui';

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

  if (!menu) {
    return (
      <div className="page">
        <p className={loadError ? 'error' : 'muted'}>{loadError ?? 'Cargando…'}</p>
      </div>
    );
  }

  const soldOutCount = menu.groups.reduce((sum, group) => sum + group.items.filter((item) => item.soldOut && !item.locked).length, 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Menú de hoy · {formatDay(menu.day)}</h1>
          <p className="muted">Lo que cambies acá se ve en la web en menos de un minuto y vuelve a la normalidad mañana solo.</p>
        </div>
      </div>

      <div className={menu.ordersPaused ? 'block alert' : 'block'}>
        <div className="block-head">
          <Icon name={menu.ordersPaused ? 'pause' : 'check'} />
          <div style={{ display: 'grid', gap: 2, flex: '1 1 320px' }}>
            <h2>{menu.ordersPaused ? 'Pedidos pausados por hoy' : 'Tomando pedidos'}</h2>
            <p className="muted small">
              {menu.ordersPaused
                ? 'La web dice "Por hoy no tomamos más pedidos" y no deja mandar. Los que ya llegaron siguen en la lista.'
                : 'Si la cocina no da más, pausalos: la web deja de aceptar pedidos hasta que los reanudes (o hasta mañana).'}
            </p>
          </div>
          <div className="end inline">
            {menu.ordersPaused ? (
              <button className="btn primary" disabled={busy === 'pause'} onClick={() => void apply('pause', { ordersPaused: false })}>
                Reanudar pedidos
              </button>
            ) : confirmPause ? (
              <>
                <span>¿Pausar por hoy?</span>
                <button
                  className="btn danger"
                  disabled={busy === 'pause'}
                  onClick={() => {
                    setConfirmPause(false);
                    void apply('pause', { ordersPaused: true });
                  }}
                >
                  Sí, pausar
                </button>
                <button className="btn" onClick={() => setConfirmPause(false)}>
                  No
                </button>
              </>
            ) : (
              <button className="btn" onClick={() => setConfirmPause(true)}>
                <Icon name="pause" size="sm" />
                Pausar pedidos
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <p className="muted">
        <strong style={{ color: 'var(--washi)' }}>
          {soldOutCount === 0 ? 'Nada agotado hoy.' : `${soldOutCount} ${soldOutCount === 1 ? 'cosa agotada' : 'cosas agotadas'} hoy.`}
        </strong>{' '}
        Lo agotado se ve desteñido en la web y no se puede pedir; si alguien ya lo tenía en el carrito, tiene que sacarlo.
      </p>

      {menu.groups.map((group) => (
        <section key={group.name} className="block">
          <h2>{group.name}</h2>
          <table>
            <tbody>
              {group.items.map((item) => (
                <tr key={item.id} className={item.soldOut ? 'off' : undefined}>
                  <td>
                    <span className="name">{item.name}</span>
                    {item.soldOut && (
                      <span className="tag out" style={{ marginLeft: 10 }}>
                        Agotado hoy
                      </span>
                    )}
                  </td>
                  <td className="actions">
                    {item.locked ? (
                      <span className="muted small">Apagado en el código de la web</span>
                    ) : (
                      <button
                        className={item.soldOut ? 'btn sm primary' : 'btn sm'}
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
        </section>
      ))}
    </div>
  );
}
