'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { BUSINESS } from '@/config/business';
import { BUILD_CATEGORY_ID, CATEGORIES } from '@/data/menu';
import { toBoxInput } from '@/store/useCartStore';
import type { BoxCartItem, CategoryId } from '@/types';

import { BoxBuilder, EMPTY_BOX_DRAFT, isBoxDraftActive, type BoxDraft } from './BoxBuilder';
import { CartDrawer } from './CartDrawer';
import { CategoryNav } from './CategoryNav';
import { CategorySection } from './CategorySection';
import { FloatingCartBar } from './FloatingCartBar';
import { SiteHeader } from './SiteHeader';
import { StatusBand } from './StatusBand';

export function Shop() {
  const router = useRouter();
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId>(CATEGORIES[0]?.id ?? BUILD_CATEGORY_ID);
  // Lives here so the box survives switching tabs, and "Editar" in the cart can load one
  const [boxDraft, setBoxDraft] = useState<BoxDraft>(EMPTY_BOX_DRAFT);

  const selectCategory = (id: CategoryId) => {
    setActiveCategory(id);
    // If the menu was scrolled past, bring the new category's top back under the sticky nav
    const panel = document.getElementById(id);
    if (panel && panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: 'start' });
  };

  const editBox = (item: BoxCartItem) => {
    setBoxDraft({ ...toBoxInput(item), editingLineId: item.lineId, notice: null });
    setCartOpen(false);
    setActiveCategory(BUILD_CATEGORY_ID);
    // After the drawer closes and the tab renders
    requestAnimationFrame(() => document.getElementById(BUILD_CATEGORY_ID)?.scrollIntoView({ block: 'start' }));
  };

  // One plate per screen: while a box is in progress its bar replaces "Ver pedido"
  const builderBarShown = activeCategory === BUILD_CATEGORY_ID && isBoxDraftActive(boxDraft);

  return (
    <>
      <div className="flex flex-1 flex-col">
        <SiteHeader onOpenCart={() => setCartOpen(true)} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
          <h1 className="sr-only">{BUSINESS.name} · Menú</h1>
          <div className="pt-4 pb-2">
            <StatusBand />
          </div>

          <CategoryNav active={activeCategory} onSelect={selectCategory} />

          {CATEGORIES.filter((category) => category.id === activeCategory).map((category) => (
            <CategorySection key={category.id} category={category}>
              {category.id === BUILD_CATEGORY_ID ? (
                <BoxBuilder draft={boxDraft} onDraftChange={setBoxDraft} onOpenCart={() => setCartOpen(true)} />
              ) : undefined}
            </CategorySection>
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

      {!cartOpen && !builderBarShown && <FloatingCartBar onOpenCart={() => setCartOpen(true)} />}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          router.push('/checkout');
        }}
        onEditBox={editBox}
      />
    </>
  );
}
