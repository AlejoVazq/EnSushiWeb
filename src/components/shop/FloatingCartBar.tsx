'use client';

import { formatPrice } from '@/lib/format';
import { selectCartItemCount, selectCartTotal, useCartStore } from '@/store/useCartStore';

interface FloatingCartBarProps {
  onOpenCart: () => void;
}

/** Mobile-only shortcut to the cart, shown once there is something in it: the menu's one reversed plate */
export function FloatingCartBar({ onOpenCart }: FloatingCartBarProps) {
  const count = useCartStore(selectCartItemCount);
  const total = useCartStore(selectCartTotal);

  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-sumi via-sumi/90 to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] font-ui sm:hidden">
      <button
        type="button"
        onClick={onOpenCart}
        className="flex h-14 w-full items-center justify-between rounded-2xl bg-washi px-4 font-bold text-sumi shadow-lg shadow-black/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi"
      >
        <span className="flex items-center gap-3">
          <span
            key={count}
            className="grid h-8 min-w-8 -rotate-6 animate-stamp place-items-center rounded-md bg-shu px-1.5 font-title text-sm text-shu-fg tabular-nums"
          >
            {count}
          </span>
          Ver pedido
        </span>
        <span className="tabular-nums">{formatPrice(total)}</span>
      </button>
    </div>
  );
}
