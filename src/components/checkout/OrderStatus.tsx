'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { buttonClassName } from '@/components/ui/Button';
import { BUSINESS } from '@/config/business';
import { formatPrice } from '@/lib/format';
import { getOrder, type ApiResult } from '@/lib/pedidosApp';
import type { CustomerOrder } from '@/types/pedidos';

/** How often the page asks for news while the shop hasn't answered */
const POLL_MS = 10_000;

/** /pedido/[id]: "waiting", then the time the shop set, or why it couldn't take it */
export function OrderStatus() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<ApiResult<CustomerOrder> | null>(null);

  useEffect(() => {
    let active = true;
    let timer = 0;
    const load = async () => {
      const next = await getOrder(id);
      if (!active) return;
      setResult(next);
      // Keep asking while it's waiting (or the connection failed); stop once the shop answered
      if (!next.ok || next.data.status === 'nuevo') timer = window.setTimeout(load, POLL_MS);
    };
    void load();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [id]);

  const order = result?.ok ? result.data : null;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 py-10 text-center">
      {!result && <p className="text-washi-muted">Cargando tu pedido…</p>}

      {result && !result.ok && (
        <>
          <h1 className="font-title text-2xl">No pudimos ver tu pedido</h1>
          <p className="text-washi-muted">{result.error}</p>
        </>
      )}

      {order?.status === 'nuevo' && (
        <>
          <h1 className="font-title text-2xl text-balance">Recibimos tu pedido #{order.number}</h1>
          <p className="text-washi-muted">
            El local lo está mirando. Te confirmamos el horario por WhatsApp y también acá (esta página se actualiza sola).
          </p>
        </>
      )}

      {order?.status === 'confirmado' && (
        <>
          <h1 className="font-title text-2xl text-balance">¡Pedido #{order.number} confirmado!</h1>
          <p className="text-lg">
            {order.deliveryMethod === 'delivery' ? 'Sale para tu casa' : `Lo retirás en ${BUSINESS.pickup.address}`} aprox. a
            las <strong>{order.eta}</strong>.
          </p>
          <p className="text-washi-muted">Total: {formatPrice(order.total)}. Los detalles te llegan por WhatsApp.</p>
        </>
      )}

      {order?.status === 'rechazado' && (
        <>
          <h1 className="font-title text-2xl text-balance">No podemos tomar tu pedido #{order.number}</h1>
          <p className="text-washi-muted">{order.rejectReason}</p>
          <p className="text-washi-muted">Disculpá. Si querés, escribinos por WhatsApp.</p>
        </>
      )}

      <Link href="/" className={buttonClassName({ variant: 'secondary', fullWidth: true })}>
        Volver al menú
      </Link>
    </main>
  );
}
