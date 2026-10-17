import Link from 'next/link';

import { getLineFlavorNames, getLineName } from '@/lib/cartLine';
import { formatPrice } from '@/lib/format';
import { cartTotal, lineSubtotal } from '@/store/useCartStore';
import type { CartItem } from '@/types';

interface OrderSummaryProps {
  items: readonly CartItem[];
  /** Integer ARS; the row is hidden when 0 */
  deliveryFee: number;
}

export function OrderSummary({ items, deliveryFee }: OrderSummaryProps) {
  const subtotal = cartTotal(items);

  return (
    <section aria-labelledby="summary-title" className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 id="summary-title" className="font-display text-2xl font-medium">
          Tu pedido
        </h2>
        <Link href="/" className="text-sm text-accent hover:text-accent-strong">
          Editar
        </Link>
      </div>
      <ul className="divide-y divide-line">
        {items.map((item) => {
          const flavors = getLineFlavorNames(item);
          return (
            <li key={item.lineId} className="flex justify-between gap-4 py-3 text-sm">
              <div className="min-w-0">
                <p>
                  <span className="text-muted tabular-nums">{item.quantity}× </span>
                  {getLineName(item)}
                </p>
                {flavors.length > 0 && <p className="text-muted">{flavors.join(', ')}</p>}
              </div>
              <p className="shrink-0 font-medium tabular-nums">{formatPrice(lineSubtotal(item))}</p>
            </li>
          );
        })}
      </ul>
      {deliveryFee > 0 && (
        <dl className="space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Envío</dt>
            <dd className="tabular-nums">{formatPrice(deliveryFee)}</dd>
          </div>
        </dl>
      )}
      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-muted">Total</span>
        <span className="text-2xl font-semibold tabular-nums">{formatPrice(subtotal + deliveryFee)}</span>
      </div>
    </section>
  );
}
