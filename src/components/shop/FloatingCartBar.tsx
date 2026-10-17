'use client';

import { formatPrice } from '@/lib/format';
import { selectCartItemCount, selectCartTotal, useCartStore } from '@/store/useCartStore';

interface FloatingCartBarProps {
  onOpenCart: () => void;
}

/** Mobile-only shortcut to the cart, shown once there is something in it */
export function FloatingCartBar({ onOpenCart }: FloatingCartBarProps) {
  const count = useCartStore(selectCartItemCount);
  const total = useCartStore(selectCartTotal);

  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-canvas via-canvas/90 to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden">
      <button
        type="button"
        onClick={onOpenCart}
        className="flex h-14 w-full items-center justify-between rounded-full bg-accent px-5 font-medium text-accent-fg shadow-lg shadow-black/40"
      >
        <span className="flex items-center gap-3">
          <span className="grid size-7 place-items-center rounded-full bg-accent-fg/15 text-sm tabular-nums">
            {count}
          </span>
          Ver pedido
        </span>
        <span className="font-semibold tabular-nums">{formatPrice(total)}</span>
      </button>
    </div>
  );
}
