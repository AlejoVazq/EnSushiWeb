'use client';

import type { ReactNode } from 'react';

import { MinusIcon, PlusIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { useCartStore } from '@/store/useCartStore';

/** Quantity of one cart line, 0 when it isn't in the order */
export const useLineQuantity = (lineId: string): number =>
  useCartStore((state) => state.items.find((item) => item.lineId === lineId)?.quantity ?? 0);

/** Bermellón seal: this line is in the order, with its quantity. Re-stamps on every change. */
export function Seal({ quantity, className }: { quantity: number; className?: string }) {
  return (
    <span
      key={quantity}
      className={cn(
        '-rotate-6 animate-stamp place-items-center rounded-md bg-shu font-title text-shu-fg tabular-nums',
        className,
      )}
    >
      {quantity}
    </span>
  );
}

/** Hollow seal: on the menu, but not orderable right now ("Agotado hoy", "Hasta las 19:30") */
export function HollowSeal({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex h-9 shrink-0 -rotate-3 items-center rounded-md border-[1.5px] border-washi-muted px-2.5 text-sm font-bold whitespace-nowrap text-washi"
    >
      {children}
    </span>
  );
}

export const stepButtonClassName =
  'grid size-11 place-items-center rounded-full text-washi-muted transition-colors hover:bg-sumi-2 hover:text-washi focus-visible:outline-2 focus-visible:outline-washi disabled:pointer-events-none disabled:opacity-35';

export const addButtonClassName =
  'grid size-11 shrink-0 place-items-center rounded-[10px] border border-hairline-strong text-washi transition-colors hover:border-washi hover:bg-sumi-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi disabled:pointer-events-none disabled:opacity-35';

interface LineActionProps {
  lineId: string;
  /** Accessible name, e.g. "Combo Kanituna · 25 piezas" */
  label: string;
  onAdd: () => void;
}

/** "+" until the line is in the order; then − seal +. Removing the line is the cart's job, so − stops at 1. */
export function LineAction({ lineId, label, onAdd }: LineActionProps) {
  const quantity = useLineQuantity(lineId);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  if (quantity === 0) {
    return (
      <button type="button" onClick={onAdd} aria-label={`Agregar ${label} al pedido`} className={addButtonClassName}>
        <PlusIcon />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => updateQuantity(lineId, quantity - 1)}
        disabled={quantity <= 1}
        aria-label={`Quitar uno de ${label}`}
        className={stepButtonClassName}
      >
        <MinusIcon />
      </button>
      <span aria-live="polite" className="grid size-11 place-items-center">
        <Seal quantity={quantity} className="grid size-10 text-lg" />
        <span className="sr-only"> en tu pedido</span>
      </span>
      <button type="button" onClick={onAdd} aria-label={`Agregar uno más de ${label}`} className={stepButtonClassName}>
        <PlusIcon />
      </button>
    </div>
  );
}
