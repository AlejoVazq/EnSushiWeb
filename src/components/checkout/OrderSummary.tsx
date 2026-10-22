import Link from 'next/link';

import { lineTitle } from '@/components/shop/lineText';
import { formatBoxContents } from '@/lib/cartLine';
import { formatPrice } from '@/lib/format';
import { cartTotal, lineSubtotal } from '@/store/useCartStore';
import type { CartItem } from '@/types';

interface OrderSummaryProps {
  items: readonly CartItem[];
  /** Integer ARS; the row is hidden when 0 */
  deliveryFee: number;
}

/** The order as the message will read it: same lines as the cart, then Subtotal / Envío / Total */
export function OrderSummary({ items, deliveryFee }: OrderSummaryProps) {
  const subtotal = cartTotal(items);

  return (
    <section aria-labelledby="summary-title" className="rounded-2xl border border-hairline p-5">
      <div className="mb-1 flex items-center justify-between gap-4">
        <h2 id="summary-title" className="font-title text-xl">
          Tu pedido
        </h2>
        <Link
          href="/"
          className="-mr-2 inline-flex h-11 items-center rounded-[10px] px-2 text-sm font-bold text-washi underline underline-offset-4 transition-colors hover:bg-sumi-2 focus-visible:outline-2 focus-visible:outline-washi"
        >
          Editar
        </Link>
      </div>
      <ul className="divide-y divide-hairline">
        {items.map((item) => (
          <li key={item.lineId} className="flex justify-between gap-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-bold text-washi tabular-nums">{lineTitle(item)}</p>
              {item.kind === 'box' && <p className="text-washi-muted">{formatBoxContents(item.box)}</p>}
            </div>
            <p className="shrink-0 font-bold tabular-nums">{formatPrice(lineSubtotal(item))}</p>
          </li>
        ))}
      </ul>
      {deliveryFee > 0 && (
        <dl className="space-y-1 border-t border-hairline pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-washi-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-washi-muted">Envío</dt>
            <dd className="tabular-nums">{formatPrice(deliveryFee)}</dd>
          </div>
        </dl>
      )}
      <div className="mt-2 flex items-baseline justify-between border-t border-hairline pt-4">
        <span className="text-washi-muted">Total</span>
        <span className="text-2xl font-bold tabular-nums">{formatPrice(subtotal + deliveryFee)}</span>
      </div>
    </section>
  );
}
