'use client';

import { BagIcon } from '@/components/ui/icons';
import { BUSINESS } from '@/config/business';
import { selectCartItemCount, useCartStore } from '@/store/useCartStore';

interface SiteHeaderProps {
  onOpenCart: () => void;
}

export function SiteHeader({ onOpenCart }: SiteHeaderProps) {
  const count = useCartStore(selectCartItemCount);

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <p className="font-display text-2xl font-medium tracking-tight">{BUSINESS.name}</p>
        <button
          type="button"
          onClick={onOpenCart}
          aria-label={count > 0 ? `Ver pedido (${count} productos)` : 'Ver pedido'}
          className="relative grid size-11 place-items-center rounded-full border border-line bg-surface transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-accent"
        >
          <BagIcon />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-fg tabular-nums">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
