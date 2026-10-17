'use client';

import { getProductsByCategory, hasDayRestrictions } from '@/data/menu';
import { useIsClient } from '@/hooks/useIsClient';
import type { Category, CustomComboProduct } from '@/types';

import { categoryTabId } from './CategoryNav';
import { ProductCard } from './ProductCard';

interface CategorySectionProps {
  category: Category;
  onCustomize: (product: CustomComboProduct) => void;
}

function SkeletonGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1].map((i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl border border-line bg-surface" />
      ))}
    </div>
  );
}

/** Categories without day restrictions ignore the date, so the prerender can use any fixed one */
const PRERENDER_DATE = new Date(0);

export function CategorySection({ category, onCustomize }: CategorySectionProps) {
  const isClient = useIsClient();
  // Day-dependent categories must use the visitor's clock, never the server's/build's
  const waitForClient = hasDayRestrictions(category.id) && !isClient;
  const products = waitForClient
    ? []
    : getProductsByCategory(category.id, isClient ? new Date() : PRERENDER_DATE);

  return (
    <section id={category.id} role="tabpanel" aria-labelledby={categoryTabId(category.id)} className="scroll-mt-36">
      <header className="mb-6 space-y-1">
        <h2 className="font-display text-3xl font-medium sm:text-4xl">
          {category.name}
        </h2>
        <p className="text-muted">{category.description}</p>
      </header>

      {waitForClient ? (
        <SkeletonGrid />
      ) : products.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line px-6 py-10 text-center text-muted">
          Hoy no hay nada disponible en esta sección. ¡Volvé mañana!
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onCustomize={onCustomize} />
          ))}
        </div>
      )}
    </section>
  );
}
