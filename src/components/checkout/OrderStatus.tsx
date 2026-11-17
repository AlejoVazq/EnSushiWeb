'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button, buttonClassName } from '@/components/ui/Button';
import { BUSINESS } from '@/config/business';
import { formatPrice } from '@/lib/format';
import { getAccount, getOrder, linkOrder, type ApiResult } from '@/lib/pedidosApp';
import type { CustomerOrder } from '@/types/pedidos';

import { LoginSheet } from './LoginSheet';

/** The invitation for guests: unknown until asked, offered, or done (this order went into the new account) */
type Invite = 'unknown' | 'offer' | 'linked' | 'none';

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

  // Ordered as a guest: registering gets discount codes, and this order fills their next checkout
  const [invite, setInvite] = useState<Invite>('unknown');
  const [loginOpen, setLoginOpen] = useState(false);
  useEffect(() => {
    let active = true;
    void getAccount().then((account) => {
      if (active) setInvite(account.ok ? 'none' : 'offer');
    });
    return () => {
      active = false;
    };
  }, []);

  const onLoggedIn = async () => {
    setLoginOpen(false);
    const linked = await linkOrder(id);
    setInvite(linked.ok ? 'linked' : 'none');
  };

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

      {order && invite === 'offer' && (
        <section aria-labelledby="invite-title" className="space-y-3 rounded-xl border border-hairline p-4 text-left">
          <div>
            <h2 id="invite-title" className="font-bold text-washi">
              ¿Querés códigos de descuento?
            </h2>
            <p className="mt-1 text-sm text-pretty text-washi-muted">
              Registrate con tu correo: los códigos son para clientes registrados y en el próximo pedido tus datos ya
              están cargados.
            </p>
          </div>
          <Button variant="secondary" fullWidth onClick={() => setLoginOpen(true)}>
            Registrarme
          </Button>
        </section>
      )}
      {invite === 'linked' && (
        <p role="status" className="rounded-xl border border-hairline p-4 text-sm text-washi-muted">
          Listo, ya estás registrado. Este pedido quedó en tu cuenta.
        </p>
      )}

      <Link href="/" className={buttonClassName({ variant: 'secondary', fullWidth: true })}>
        Volver al menú
      </Link>

      <LoginSheet open={loginOpen} reason="pedido" onClose={() => setLoginOpen(false)} onLoggedIn={() => void onLoggedIn()} />
    </main>
  );
}
