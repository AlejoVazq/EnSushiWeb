'use client';

import type { ReactNode } from 'react';

import { getMenuByCategory, hasDayRestrictions } from '@/data/menu';
import { useIsClient } from '@/hooks/useIsClient';
import { getNow } from '@/lib/schedule';
import type { Category } from '@/types';

import { categoryTabId } from './CategoryNav';
import { ProductRow } from './ProductRow';

interface CategorySectionProps {
  category: Category;
  /** Replaces the product rows (Arma tu combo shows its builder here) */
  children?: ReactNode;
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-hairline border-y border-hairline" aria-hidden="true">
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-4 py-5">
          <div className="size-22 animate-pulse rounded-xl bg-sumi-1 sm:size-26" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-5 w-2/3 animate-pulse rounded bg-sumi-1" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-sumi-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Categories without day restrictions ignore the date, so the prerender can use any fixed one */
const PRERENDER_DATE = new Date(0);

export function CategorySection({ category, children }: CategorySectionProps) {
  const isClient = useIsClient();
  // Day-dependent categories must use the visitor's clock, never the server's/build's
  const waitForClient = hasDayRestrictions(category.id) && !isClient;
  // Sold-out products stay listed (greyed out) so regulars know they're only out for today
  const products = waitForClient ? [] : getMenuByCategory(category.id, isClient ? getNow() : PRERENDER_DATE);

  return (
    <section id={category.id} role="tabpanel" aria-labelledby={categoryTabId(category.id)} className="@container scroll-mt-28">
      <header className="mb-4 space-y-1">
        <h2 className="font-title text-3xl leading-tight text-balance text-washi sm:text-4xl">{category.name}</h2>
        <p className="text-washi-muted">{category.description}</p>
      </header>

      {children ??
        (waitForClient ? (
          <SkeletonRows />
        ) : products.length === 0 ? (
          <p className="rounded-xl border border-hairline px-6 py-10 text-center text-washi-muted">
            Hoy no hay nada disponible en esta sección. ¡Volvé mañana!
          </p>
        ) : (
          <ul className="grid border-t border-hairline @2xl:grid-cols-2 @2xl:gap-x-12">
            {products.map((product) => (
              <li key={product.id} className="@container border-b border-hairline">
                <ProductRow product={product} />
              </li>
            ))}
          </ul>
        ))}
    </section>
  );
}
