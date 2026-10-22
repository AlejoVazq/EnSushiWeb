'use client';

import { getMenuByCategory, hasDayRestrictions } from '@/data/menu';
import { useIsClient } from '@/hooks/useIsClient';
import type { Category, CustomComboProduct, Product } from '@/types';

import { categoryTabId } from './CategoryNav';
import { ProductCard } from './ProductCard';
import { ProductRow, type RowProduct } from './ProductRow';

interface CategorySectionProps {
  category: Category;
  onCustomize: (product: CustomComboProduct) => void;
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

const isRowProduct = (product: Product): product is RowProduct => product.type !== 'custom-combo';

/** Categories without day restrictions ignore the date, so the prerender can use any fixed one */
const PRERENDER_DATE = new Date(0);

export function CategorySection({ category, onCustomize }: CategorySectionProps) {
  const isClient = useIsClient();
  // Day-dependent categories must use the visitor's clock, never the server's/build's
  const waitForClient = hasDayRestrictions(category.id) && !isClient;
  // Sold-out products stay listed (greyed out) so regulars know they're only out for today
  const listed = waitForClient ? [] : getMenuByCategory(category.id, isClient ? new Date() : PRERENDER_DATE);
  const rows = listed.filter(isRowProduct);
  // The previous Arma tu combo card has no sold-out state: it keeps hiding them until Paso 10
  const builders = listed.filter(
    (product): product is CustomComboProduct => product.type === 'custom-combo' && product.available,
  );
  const products = [...rows, ...builders];

  return (
    <section id={category.id} role="tabpanel" aria-labelledby={categoryTabId(category.id)} className="scroll-mt-28">
      <header className="mb-4 space-y-1">
        <h2 className="font-title text-3xl leading-tight text-balance text-washi sm:text-4xl">{category.name}</h2>
        <p className="text-washi-muted">{category.description}</p>
      </header>

      {waitForClient ? (
        <SkeletonRows />
      ) : products.length === 0 ? (
        <p className="rounded-xl border border-hairline px-6 py-10 text-center text-washi-muted">
          Hoy no hay nada disponible en esta sección. ¡Volvé mañana!
        </p>
      ) : (
        <>
          {rows.length > 0 && (
            <ul className="grid border-t border-hairline lg:grid-cols-2 lg:gap-x-12">
              {rows.map((product) => (
                <li key={product.id} className="border-b border-hairline">
                  <ProductRow product={product} />
                </li>
              ))}
            </ul>
          )}
          {/* Arma tu combo keeps the previous card until the builder is redone in Paso 10 */}
          {builders.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {builders.map((product) => (
                <ProductCard key={product.id} product={product} onCustomize={onCustomize} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
