'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { BUSINESS } from '@/config/business';
import { CATEGORIES } from '@/data/menu';
import type { CategoryId, CustomComboProduct } from '@/types';

import { CartDrawer } from './CartDrawer';
import { CategoryNav } from './CategoryNav';
import { CategorySection } from './CategorySection';
import { ComboBuilder } from './ComboBuilder';
import { FloatingCartBar } from './FloatingCartBar';
import { SiteHeader } from './SiteHeader';

interface BuilderSession {
  product: CustomComboProduct;
  /** Incremented on every open so the builder remounts with a fresh selection */
  key: number;
}

export function Shop() {
  const router = useRouter();
  const [cartOpen, setCartOpen] = useState(false);
  const [builder, setBuilder] = useState<BuilderSession | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId>(CATEGORIES[0]?.id ?? 'arma-tu-combo');

  const selectCategory = (id: CategoryId) => {
    setActiveCategory(id);
    // If the menu was scrolled past, bring the new category's top back under the sticky nav
    const panel = document.getElementById(id);
    if (panel && panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: 'start' });
  };

  const openBuilder = (product: CustomComboProduct) => {
    setBuilder((prev) => ({ product, key: (prev?.key ?? 0) + 1 }));
    setBuilderOpen(true);
  };

  return (
    <>
      <SiteHeader onOpenCart={() => setCartOpen(true)} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 sm:px-6 sm:pb-20">
        <section className="py-12 sm:py-20">
          <p className="mb-3 text-sm font-medium tracking-[0.2em] text-accent uppercase">Pedidos online</p>
          <h1 className="max-w-2xl font-display text-5xl leading-[1.05] font-medium sm:text-6xl">
            Sushi de autor, directo a tu casa.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Elegí del menú o armá tu propio combo, y mandanos el pedido por WhatsApp.
          </p>
        </section>

        <CategoryNav active={activeCategory} onSelect={selectCategory} />

        {CATEGORIES.filter((category) => category.id === activeCategory).map((category) => (
          <CategorySection key={category.id} category={category} onCustomize={openBuilder} />
        ))}
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-subtle">
        {BUSINESS.name} · Pedidos por WhatsApp
      </footer>

      {!cartOpen && <FloatingCartBar onOpenCart={() => setCartOpen(true)} />}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          router.push('/checkout');
        }}
      />
      {builder && (
        <ComboBuilder
          key={builder.key}
          open={builderOpen}
          initialProduct={builder.product}
          onClose={() => setBuilderOpen(false)}
        />
      )}
    </>
  );
}
