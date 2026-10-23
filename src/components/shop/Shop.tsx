'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { BUSINESS } from '@/config/business';
import { BUILD_CATEGORY_ID, CATEGORIES, EXTRAS_CATEGORY_ID } from '@/data/menu';
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { useWarmMenuPhotos } from '@/hooks/useWarmMenuPhotos';
import { toBoxInput } from '@/store/useCartStore';
import type { BoxCartItem, CategoryId } from '@/types';

import { BoxBuilder, EMPTY_BOX_DRAFT, isBoxBarShown, useBoxLock, type BoxDraft } from './BoxBuilder';
import { CART_PANEL_TITLE_ID, CartDrawer } from './CartDrawer';
import { CategoryNav } from './CategoryNav';
import { CategorySection } from './CategorySection';
import { ExtrasList } from './ExtraRow';
import { FloatingCartBar } from './FloatingCartBar';
import { SiteHeader } from './SiteHeader';
import { StatusBand } from './StatusBand';

export function Shop() {
  const router = useRouter();
  const [cartOpen, setCartOpen] = useState(false);
  // From `lg` the order is a panel beside the menu, always on screen; below, a drawer
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  useWarmMenuPhotos();

  /** The header's bag, "Ver pedido": opens the drawer, or on desktop takes focus to the panel */
  const openCart = () => {
    if (isDesktop) document.getElementById(CART_PANEL_TITLE_ID)?.focus();
    else setCartOpen(true);
  };

  const checkout = () => {
    setCartOpen(false);
    router.push('/checkout');
  };
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
  const boxLock = useBoxLock();
  const builderBarShown = activeCategory === BUILD_CATEGORY_ID && isBoxBarShown(boxDraft, boxLock);

  return (
    <>
      <div className="flex flex-1 flex-col">
        <SiteHeader onOpenCart={openCart} />

        <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
          <main className="min-w-0">
            <h1 className="sr-only">{BUSINESS.name} · Menú</h1>
            <div className="pt-4 pb-2">
              <StatusBand />
            </div>

            <CategoryNav active={activeCategory} onSelect={selectCategory} />

            {CATEGORIES.filter((category) => category.id === activeCategory).map((category) => (
              <CategorySection key={category.id} category={category}>
                {category.id === BUILD_CATEGORY_ID ? (
                  <BoxBuilder draft={boxDraft} onDraftChange={setBoxDraft} onOpenCart={openCart} />
                ) : category.id === EXTRAS_CATEGORY_ID ? (
                  <ExtrasList />
                ) : undefined}
              </CategorySection>
            ))}
          </main>

          {/* The column is reserved from the first paint; its contents wait for the clock and the saved cart */}
          <aside className="sticky top-14 hidden pt-4 lg:block">
            {isDesktop && <CartDrawer layout="panel" onClose={() => {}} onCheckout={checkout} onEditBox={editBox} />}
          </aside>
        </div>

        <footer className="border-t border-hairline">
          <div className="mx-auto max-w-7xl space-y-3 px-4 pt-12 pb-32 sm:px-6 lg:pb-14">
            <p className="font-title text-2xl leading-tight text-balance sm:text-3xl">Sushi de autor, directo a tu casa.</p>
            <p className="max-w-md text-pretty text-washi-muted">
              Armá tu propio combo, o elegí de nuestros combos, y mandanos el pedido por WhatsApp.
            </p>
            <p className="pt-4 text-sm text-washi-muted">{BUSINESS.name} · Pedidos por WhatsApp</p>
          </div>
        </footer>
      </div>

      {!cartOpen && !builderBarShown && <FloatingCartBar onOpenCart={openCart} />}
      {!isDesktop && (
        <CartDrawer
          layout="sheet"
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          onCheckout={checkout}
          onEditBox={editBox}
        />
      )}
    </>
  );
}
