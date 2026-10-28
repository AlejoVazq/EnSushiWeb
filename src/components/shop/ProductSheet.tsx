'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

import { Sheet } from '@/components/ui/Sheet';
import { TAG_LABELS } from '@/lib/labels';
import type { Product } from '@/types';

import { HollowSeal, LineAction, useLineQuantity } from './LineAction';

/** The cart line the row's control adds to: the product, or the chosen option or size */
export interface ProductLine {
  lineId: string;
  /** Accessible name, e.g. "SushiBurger Salmón · Crudo" */
  label: string;
  onAdd: () => void;
}

interface ProductSheetProps {
  product: Product;
  open: boolean;
  onClose: () => void;
  /** Photo of the chosen option, or the product's; null without one */
  imageUrl: string | null;
  /** Option or size chips, kept in step with the row's */
  picker: ReactNode;
  /** "$ 15.000", or what comes with the chosen size */
  price: ReactNode;
  /** Plain text of the price, for "Agregar · $ 15.000" */
  priceText: string | null;
  line: ProductLine;
  soldOut: boolean;
  canOrder: boolean;
}

/** A product's photo and what it has, with the same controls as its row */
export function ProductSheet({ product, open, onClose, imageUrl, picker, price, priceText, line, soldOut, canOrder }: ProductSheetProps) {
  const quantity = useLineQuantity(line.lineId);

  let action: ReactNode = null;
  if (soldOut) action = <HollowSeal>Agotado hoy</HollowSeal>;
  else if (!canOrder) action = null;
  else if (quantity === 0)
    action = (
      <button
        type="button"
        onClick={line.onAdd}
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-washi px-4 font-bold text-sumi tabular-nums transition-colors hover:bg-washi/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi"
      >
        {priceText ? `Agregar · ${priceText}` : 'Agregar'}
      </button>
    );
  else
    action = (
      <div className="flex items-center gap-3">
        <LineAction {...line} />
        <button
          type="button"
          onClick={onClose}
          className="h-14 flex-1 rounded-2xl border border-hairline-strong font-bold text-washi transition-colors hover:border-washi hover:bg-sumi-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi"
        >
          Listo
        </button>
      </div>
    );

  // "Agregar · $ 14.000" already says the price
  const showPrice = !(canOrder && !soldOut && quantity === 0 && priceText);
  const footer = (
    <div className="space-y-3">
      {showPrice && <div className="flex min-h-6 items-baseline justify-between gap-4">{price}</div>}
      {action}
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title={product.name} side="bottom" footer={footer}>
      <div className="space-y-4 py-4">
        {imageUrl && (
          <div className="relative aspect-square overflow-hidden rounded-xl bg-sumi-2">
            <Image src={imageUrl} alt={product.name} fill sizes="(min-width: 640px) 470px, 100vw" className="object-cover" />
          </div>
        )}
        {product.description && <p className="leading-relaxed text-pretty text-washi">{product.description}</p>}
        {product.tags && product.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {product.tags.map((tag) => (
              <li key={tag} className="rounded-md border border-hairline px-2 py-0.5 text-xs font-medium text-washi-muted">
                {TAG_LABELS[tag]}
              </li>
            ))}
          </ul>
        )}
        {picker}
      </div>
    </Sheet>
  );
}
