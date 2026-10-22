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
import { StatusBand } from './StatusBand';

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
      {/* Sello y sumi covers the menu only; the cart and the builder keep the previous look until Fase 7 */}
      <div className="flex flex-1 flex-col bg-sumi font-ui text-washi selection:bg-washi selection:text-sumi">
        <SiteHeader onOpenCart={() => setCartOpen(true)} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
          <h1 className="sr-only">{BUSINESS.name} · Menú</h1>
          <div className="pt-4 pb-2">
            <StatusBand />
          </div>

          <CategoryNav active={activeCategory} onSelect={selectCategory} />

          {CATEGORIES.filter((category) => category.id === activeCategory).map((category) => (
            <CategorySection key={category.id} category={category} onCustomize={openBuilder} />
          ))}
        </main>

        <footer className="border-t border-hairline">
          <div className="mx-auto max-w-6xl space-y-3 px-4 pt-12 pb-32 sm:px-6 sm:pb-14">
            <p className="font-title text-2xl leading-tight text-balance sm:text-3xl">Sushi de autor, directo a tu casa.</p>
            <p className="max-w-md text-pretty text-washi-muted">
              Armá tu propio combo, o elegí de nuestros combos, y mandanos el pedido por WhatsApp.
            </p>
            <p className="pt-4 text-sm text-washi-muted">{BUSINESS.name} · Pedidos por WhatsApp</p>
          </div>
        </footer>
      </div>

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
