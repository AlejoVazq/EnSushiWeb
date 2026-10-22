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
    <header className="sticky top-0 z-40 border-b border-hairline bg-sumi/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Image src="/logo.png" alt={BUSINESS.name} width={900} height={299} priority className="h-7 w-auto" />
        <button
          type="button"
          onClick={onOpenCart}
          aria-label={count > 0 ? `Ver pedido (${count} productos)` : 'Ver pedido'}
          className="relative grid size-11 place-items-center rounded-full border border-hairline text-washi transition-colors hover:border-hairline-strong hover:bg-sumi-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi"
        >
          <BagIcon />
          {count > 0 && (
            <span
              key={count}
              className="absolute -top-1.5 -right-1.5 grid h-6 min-w-6 -rotate-6 animate-stamp place-items-center rounded-md bg-shu px-1 font-title text-xs text-shu-fg tabular-nums"
            >
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
