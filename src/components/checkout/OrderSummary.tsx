import Link from 'next/link';

import { getLineFlavorNames } from '@/lib/cartLine';
import { formatPrice } from '@/lib/format';
import { lineSubtotal } from '@/store/useCartStore';
import type { CartItem } from '@/types';

interface OrderSummaryProps {
  items: readonly CartItem[];
  total: number;
}

export function OrderSummary({ items, total }: OrderSummaryProps) {
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
                  {item.product.name}
                </p>
                {flavors.length > 0 && <p className="text-muted">{flavors.join(', ')}</p>}
              </div>
              <p className="shrink-0 font-medium tabular-nums">{formatPrice(lineSubtotal(item))}</p>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-muted">Total</span>
        <span className="text-2xl font-semibold tabular-nums">{formatPrice(total)}</span>
      </div>
    </section>
  );
}
