'use client';

import Image from 'next/image';

import { BagIcon } from '@/components/ui/icons';
import { BUSINESS } from '@/config/business';
import { selectCartItemCount, useCartStore } from '@/store/useCartStore';

interface SiteHeaderProps {
  onOpenCart: () => void;
}

export function SiteHeader({ onOpenCart }: SiteHeaderProps) {
  const count = useCartStore(selectCartItemCount);

  return (
    <header className="sticky top-0 z-40 border-b border-shu bg-shu">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* El logo es blanco, sobre la barra roja */}
        {/* Shown 28px tall (logo.png is 900×299): its real size picks a 1920px file for a 85px logo */}
        <Image src="/logo.png" alt={BUSINESS.name} width={85} height={28} priority className="h-7 w-auto" />
        <button
          type="button"
          onClick={onOpenCart}
          aria-label={count > 0 ? `Ver pedido (${count} productos)` : 'Ver pedido'}
          // Desktop shows the order beside the menu
          className="relative grid size-11 place-items-center rounded-full lg:hidden border border-shu-fg/45 text-shu-fg transition hover:border-shu-fg hover:bg-shu-fg/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shu-fg"
        >
          <BagIcon />
          {count > 0 && (
            <span
              key={count}
              className="absolute -top-1.5 -right-1.5 grid h-6 min-w-6 -rotate-6 animate-stamp place-items-center rounded-md bg-shu-fg px-1 font-title text-xs text-shu tabular-nums"
            >
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
