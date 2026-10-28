'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons';
import { EXTRAS_CATEGORY_ID, getBuildItemsByGroup, getProductsByCategory, isCategoryShown } from '@/data/menu';
import { useIsAvailable } from '@/hooks/useLiveMenu';
import { getNow } from '@/lib/schedule';
import { formatUnits } from '@/lib/cartLine';
import { formatItemPrice, formatPrice } from '@/lib/format';
import { getExtraLineId, getLineId, useCartStore } from '@/store/useCartStore';
import type { StandardProduct } from '@/types';

import { LineAction } from './LineAction';

interface SuggestionCardProps {
  name: string;
  detail: string;
  lineId: string;
  /** Accessible name for the add / quantity buttons */
  label: string;
  onAdd: () => void;
}

function SuggestionCard({ name, detail, lineId, label, onAdd }: SuggestionCardProps) {
  return (
    <li className="flex w-44 shrink-0 snap-start flex-col justify-between gap-3 rounded-xl border border-hairline p-3">
      <div>
        <p className="font-title text-base leading-snug wrap-anywhere text-washi">{name}</p>
        <p className="text-sm text-washi-muted tabular-nums">{detail}</p>
      </div>
      <div className="flex justify-end">
        <LineAction lineId={lineId} label={label} onAdd={onAdd} />
      </div>
    </li>
  );
}

/** Which way the row can still scroll; both false when everything fits */
interface ScrollEdges {
  back: boolean;
  forward: boolean;
}

/**
 * Arrows for the row, for a mouse (a finger just swipes it). Each one moves the row by most of its width
 * and switches off at its end.
 */
function useRowScroll() {
  const rowRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState<ScrollEdges>({ back: false, forward: false });

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    // 1px of slack: zoom and subpixel widths rarely land exactly on the end
    setEdges({ back: row.scrollLeft > 1, forward: row.scrollLeft + row.clientWidth < row.scrollWidth - 1 });
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    measure();
    row.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => {
      row.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure]);

  const scroll = (direction: 1 | -1) => {
    const row = rowRef.current;
    if (!row) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.scrollBy({ left: direction * row.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  };

  return { rowRef, edges, scroll };
}

const arrowClassName =
  'grid size-11 place-items-center rounded-full border border-hairline-strong text-washi transition-colors hover:border-washi hover:bg-sumi-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi disabled:pointer-events-none disabled:opacity-35';

const isPlainProduct = (product: { type: string }): product is StandardProduct => product.type === 'standard';

/** "¿Le sumás algo?": acompañamientos and salsas, one tap away before checking out (like a fast-food app's upsell) */
export function CartSuggestions() {
  const addExtra = useCartStore((state) => state.addExtra);
  const addItem = useCartStore((state) => state.addItem);
  const { rowRef, edges, scroll } = useRowScroll();
  const isAvailable = useIsAvailable();

  // Only while their tab is on the menu
  const extrasShown = isCategoryShown(EXTRAS_CATEGORY_ID);
  const extras = extrasShown ? getBuildItemsByGroup('acompanamientos').filter(isAvailable) : [];
  // Salsas without a required option can be added straight away
  const salsas = getProductsByCategory('salsas', getNow()).filter(isPlainProduct).filter((product) => !product.option && isAvailable(product));
  if (extras.length + salsas.length === 0) return null;

  return (
    <section aria-labelledby="cart-suggestions" className="border-t border-hairline py-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h3 id="cart-suggestions" className="font-title text-lg text-washi">
            ¿Le sumás algo?
          </h3>
          <p className="text-sm text-washi-muted">{extrasShown ? 'Acompañamientos y salsas para tu pedido.' : 'Salsas y complementos para tu pedido.'}</p>
        </div>
        {(edges.back || edges.forward) && (
          <div className="hidden shrink-0 gap-2 pointer-fine:flex">
            <button type="button" onClick={() => scroll(-1)} disabled={!edges.back} aria-label="Ver sugerencias anteriores" className={arrowClassName}>
              <ChevronLeftIcon />
            </button>
            <button type="button" onClick={() => scroll(1)} disabled={!edges.forward} aria-label="Ver más sugerencias" className={arrowClassName}>
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>
      <ul ref={rowRef} className="scrollbar-none -mx-5 flex snap-x gap-3 overflow-x-auto scroll-px-5 px-5 pb-1">
        {extras.map((item) => (
          <SuggestionCard
            key={item.id}
            name={item.name}
            detail={`${formatUnits(item.step, item.unitLabel)} · ${formatPrice(item.price)}`}
            lineId={getExtraLineId(item.id)}
            label={`${item.name} (${formatUnits(item.step, item.unitLabel)})`}
            onAdd={() => addExtra(item.id)}
          />
        ))}
        {salsas.map((product) => (
          <SuggestionCard
            key={product.id}
            name={product.name}
            detail={formatItemPrice(product.price)}
            lineId={getLineId(product.id)}
            label={product.name}
            onAdd={() => addItem({ product })}
          />
        ))}
      </ul>
    </section>
  );
}
