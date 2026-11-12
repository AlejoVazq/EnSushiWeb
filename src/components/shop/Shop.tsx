'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { LoginSheet } from '@/components/checkout/LoginSheet';
import { BUSINESS } from '@/config/business';
import { BUILD_CATEGORY_ID, EXTRAS_CATEGORY_ID, MENU_CATEGORIES } from '@/data/menu';
import { useLiveMenuSync } from '@/hooks/useLiveMenu';
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import { useWarmMenuPhotos } from '@/hooks/useWarmMenuPhotos';
import { getAccount, ORDERS_BY_APP } from '@/lib/pedidosApp';
import { toBoxInput } from '@/store/useCartStore';
import type { BoxCartItem, CategoryId } from '@/types';
import { SiteFooter } from '@/components/site/SiteFooter';

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
  // Orders by app: sold-out marks and paused orders from the shop's app
  useLiveMenuSync();

  /** The header's bag, "Ver pedido": opens the drawer, or on desktop takes focus to the panel */
  const openCart = () => {
    if (isDesktop) document.getElementById(CART_PANEL_TITLE_ID)?.focus();
    else setCartOpen(true);
  };

  // Orders by app: a phone without a session verifies its email (once) before the checkout
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  useEffect(() => {
    if (!ORDERS_BY_APP) return;
    let active = true;
    void getAccount().then((result) => {
      if (active) setLoggedIn(result.ok);
    });
    return () => {
      active = false;
    };
  }, []);

  const checkout = async () => {
    setCartOpen(false);
    if (ORDERS_BY_APP && !loggedIn) {
      // Asked again: it may have logged in from another tab since the page loaded
      const account = await getAccount();
      if (!account.ok) {
        setLoginOpen(true);
        return;
      }
      setLoggedIn(true);
    }
    router.push('/checkout');
  };
  const [activeCategory, setActiveCategory] = useState<CategoryId>(MENU_CATEGORIES[0]?.id ?? BUILD_CATEGORY_ID);
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

        <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-10">
          <main className="min-w-0">
            <h1 className="sr-only">{BUSINESS.name} · Menú</h1>
            <div className="pt-4 pb-2">
              <StatusBand />
            </div>

            <CategoryNav active={activeCategory} onSelect={selectCategory} />

            {MENU_CATEGORIES.filter((category) => category.id === activeCategory).map((category) => (
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
            {isDesktop && <CartDrawer layout="panel" onClose={() => {}} onCheckout={() => void checkout()} onEditBox={editBox} />}
          </aside>
        </div>

        {/* Room for the floating "Ver pedido" bar on the phone and the tablet */}
        <SiteFooter className="pb-32 lg:pb-10" />
      </div>

      {!cartOpen && !builderBarShown && <FloatingCartBar onOpenCart={openCart} />}
      {!isDesktop && (
        <CartDrawer
          layout="sheet"
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          onCheckout={() => void checkout()}
          onEditBox={editBox}
        />
      )}
      {ORDERS_BY_APP && (
        <LoginSheet
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          onLoggedIn={() => {
            setLoggedIn(true);
            setLoginOpen(false);
            router.push('/checkout');
          }}
        />
      )}
    </>
  );
}
