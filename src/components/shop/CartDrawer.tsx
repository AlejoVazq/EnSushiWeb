'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { MinusIcon, PlusIcon, TrashIcon } from '@/components/ui/icons';
import { Sheet } from '@/components/ui/Sheet';
import { BUSINESS } from '@/config/business';
import { useCartTotals } from '@/hooks/useCartTotals';
import { useCanOrder, useCartNotices, useScheduleStatus } from '@/hooks/useScheduleStatus';
import { formatBoxContents, getLineName } from '@/lib/cartLine';
import { formatItemPrice, formatPrice } from '@/lib/format';
import { lineSubtotal, toBoxInput, useCartStore } from '@/store/useCartStore';
import type { BoxCartItem, CartItem } from '@/types';

import { CartSuggestions } from './CartSuggestions';
import { stepButtonClassName } from './LineAction';
import { lineTitle, unitPriceText } from './lineText';

/** How long "Deshacer" stays available after removing */
const UNDO_MS = 6000;

interface CartDrawerProps {
  /**
   * sheet: a drawer opened from the header or "Ver pedido" (phone and tablet).
   * panel: always on screen next to the menu (desktop, from `lg`).
   */
  layout: 'sheet' | 'panel';
  /** Sheet only */
  open?: boolean;
  onClose: () => void;
  onCheckout: () => void;
  /** Opens Arma tu combo with this box loaded */
  onEditBox: (item: BoxCartItem) => void;
}

/** id of the panel's heading: the shop focuses it instead of opening the drawer on desktop */
export const CART_PANEL_TITLE_ID = 'cart-panel-title';

/** Lines just removed, with where they were, so "Deshacer" can put them back in place */
interface Removal {
  items: readonly CartItem[];
  index: number;
  /** "Sacaste 2× Combo Kanituna · 25 piezas", "Vaciaste el pedido" */
  message: string;
}

const lineImage = (item: CartItem): string | undefined => {
  if (item.kind === 'product') return item.optionValue?.imageUrl ?? item.product.imageUrl;
  if (item.kind === 'extra') return item.item.imageUrl;
  return undefined;
};

/** Small photo; with no photo (or a broken file) the line stands as text, like the menu rows */
function LineThumb({ src, alt }: { src: string | undefined; alt: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || src === failedSrc) return null;
  return (
    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-sumi-2">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="56px"
        className="object-cover"
        onError={() => setFailedSrc(src)}
        ref={(img) => {
          if (img?.complete && img.naturalWidth === 0) setFailedSrc(src);
        }}
      />
    </div>
  );
}

interface CartLineProps {
  item: CartItem;
  /** Set for boxes that can still be edited (before the rolls and nigiris cutoff) */
  onEdit?: () => void;
  onRemove: () => void;
  /** False while the shop isn't taking orders: lines can be reduced or removed, not increased */
  canAdd: boolean;
  /** The line's title, focused when the line above it is removed */
  titleRef: (element: HTMLHeadingElement | null) => void;
}

function CartLine({ item, onEdit, onRemove, canAdd, titleRef }: CartLineProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const name = getLineName(item);

  return (
    <li className="flex gap-3 py-4">
      <LineThumb src={lineImage(item)} alt={name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 ref={titleRef} tabIndex={-1} className="min-w-0 font-bold leading-snug wrap-anywhere text-washi tabular-nums outline-none">
            {lineTitle(item)}
          </h3>
          <p className="shrink-0 font-bold text-washi tabular-nums">{formatItemPrice(lineSubtotal(item))}</p>
        </div>
        {item.kind === 'box' && <p className="mt-0.5 text-sm leading-relaxed wrap-anywhere text-washi-muted">{formatBoxContents(item.box)}</p>}
        {/* Free lines already read "Sin cargo" next to the title */}
        {item.unitPrice > 0 && <p className="mt-0.5 text-sm text-washi-muted tabular-nums">{unitPriceText(item)}</p>}

        <div className="mt-2 flex items-center justify-between gap-2">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Editar ${name}`}
              className="h-11 rounded-[10px] border border-hairline-strong px-3.5 text-sm font-bold text-washi transition-colors hover:border-washi hover:bg-sumi-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi"
            >
              Editar
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {/* Removing has its own button: "−" stops at 1 so a double tap never deletes the line */}
            <div className="flex items-center rounded-full border border-hairline">
              <button
                type="button"
                onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                disabled={item.quantity <= 1}
                aria-label={`Quitar uno de ${name}`}
                className={stepButtonClassName}
              >
                <MinusIcon />
              </button>
              <span aria-live="polite" className="min-w-7 text-center font-bold text-washi tabular-nums">
                {item.quantity}
                <span className="sr-only"> de {name}</span>
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                disabled={!canAdd}
                aria-label={`Agregar uno más de ${name}`}
                className={stepButtonClassName}
              >
                <PlusIcon />
              </button>
            </div>
            <button type="button" onClick={onRemove} aria-label={`Sacar ${name} del pedido`} className={stepButtonClassName}>
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function UndoRow({ message, onUndo, buttonRef }: { message: string; onUndo: () => void; buttonRef: (el: HTMLButtonElement | null) => void }) {
  return (
    <li className="flex min-h-14 items-center justify-between gap-3 py-2">
      <p className="min-w-0 text-sm wrap-anywhere text-washi-muted">{message}</p>
      <button
        type="button"
        ref={buttonRef}
        onClick={onUndo}
        className="h-11 shrink-0 rounded-[10px] px-3 text-sm font-bold text-washi underline underline-offset-4 transition-colors hover:bg-sumi-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi"
      >
        Deshacer
      </button>
    </li>
  );
}

export function CartDrawer({ layout, open = false, onClose, onCheckout, onEditBox }: CartDrawerProps) {
  const items = useCartStore((state) => state.items);
  // Special day only: codes are entered in the checkout
  const { discount, total } = useCartTotals();
  const { addItem, addBox, addExtra, removeItem, updateQuantity, clearCart } = useCartStore.getState();
  const scheduleNotices = useCartNotices();
  // Past the cutoff the rolls and nigiris of a box can't change, so it can only be kept or removed
  const canOrder = useCanOrder();
  const pastCutoff = useScheduleStatus()?.isPastPreorderCutoff ?? false;
  const canEditBoxes = canOrder && !pastCutoff;
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const titleRefs = useRef(new Map<string, HTMLHeadingElement>());
  const undoRef = useRef<HTMLButtonElement | null>(null);
  /** Where focus goes once the removed line is gone: the next line's title, or "Deshacer" if none is left */
  const focusAfterRemove = useRef<string | 'undo' | null>(null);

  const isEmpty = items.length === 0;

  useEffect(() => {
    if (!removal) return;
    const id = setTimeout(() => setRemoval(null), UNDO_MS);
    return () => clearTimeout(id);
  }, [removal]);

  useEffect(() => {
    const target = focusAfterRemove.current;
    if (target === null) return;
    focusAfterRemove.current = null;
    if (target === 'undo') undoRef.current?.focus();
    else titleRefs.current.get(target)?.focus();
  }, [items, removal]);

  /** Leaving the drawer (close, checkout or Editar) makes the removal final, so it starts clean next time */
  const leave = (action: () => void) => {
    setRemoval(null);
    setConfirmingClear(false);
    action();
  };

  /** Puts a line back with its quantity, using only the store's own actions */
  const readd = (item: CartItem) => {
    switch (item.kind) {
      case 'product':
        if (item.product.type === 'sized') {
          addItem({ product: item.product, pieces: item.variant?.pieces ?? 0, quantity: item.quantity });
        } else {
          addItem({
            product: item.product,
            quantity: item.quantity,
            ...(item.optionValue && { optionId: item.optionValue.id }),
          });
        }
        return;
      case 'box':
        addBox(toBoxInput(item));
        if (item.quantity > 1) updateQuantity(item.lineId, item.quantity);
        return;
      case 'extra':
        addExtra(item.item.id);
        if (item.quantity > 1) updateQuantity(item.lineId, item.quantity);
        return;
    }
  };

  const removeLine = (item: CartItem) => {
    const index = items.findIndex((line) => line.lineId === item.lineId);
    const next = items[index + 1] ?? items[index - 1];
    focusAfterRemove.current = next ? next.lineId : 'undo';
    removeItem(item.lineId);
    const message = `Sacaste ${lineTitle(item)}`;
    setRemoval({ items: [item], index, message });
    setAnnouncement(`${message}. Podés deshacerlo.`);
  };

  const clearAll = () => {
    setRemoval({ items, index: 0, message: 'Vaciaste el pedido' });
    setAnnouncement('Vaciaste el pedido. Podés deshacerlo.');
    focusAfterRemove.current = 'undo';
    clearCart();
    setConfirmingClear(false);
  };

  /** Re-adds the removed lines where they were: the lines after them are taken out and added again behind them */
  const undo = () => {
    if (!removal) return;
    const current = useCartStore.getState().items;
    const tail = current.slice(removal.index);
    tail.forEach((line) => removeItem(line.lineId));
    for (const line of [...removal.items, ...tail]) {
      try {
        readd(line);
      } catch {
        // A line that's no longer valid (e.g. sold out meanwhile) stays out
      }
    }
    focusAfterRemove.current = removal.items[0]?.lineId ?? null;
    const [first] = removal.items;
    setAnnouncement(removal.items.length > 1 || !first ? 'Volvimos a cargar tu pedido.' : `Volviste a sumar ${lineTitle(first)}.`);
    setRemoval(null);
  };

  const rows: ReactNode[] = items.map((item) => (
    <CartLine
      key={item.lineId}
      item={item}
      onEdit={item.kind === 'box' && canEditBoxes ? () => leave(() => onEditBox(item)) : undefined}
      onRemove={() => removeLine(item)}
      canAdd={canOrder}
      titleRef={(element) => {
        if (element) titleRefs.current.set(item.lineId, element);
        else titleRefs.current.delete(item.lineId);
      }}
    />
  ));
  if (removal) {
    rows.splice(
      Math.min(removal.index, rows.length),
      0,
      <UndoRow
        key="undo"
        message={removal.message}
        onUndo={undo}
        buttonRef={(element) => {
          undoRef.current = element;
        }}
      />,
    );
  }

  const footer = isEmpty ? undefined : (
          <div className="space-y-4">
            <div>
              {discount && (
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-washi-muted">Descuento ({discount.label})</span>
                  <span className="font-bold text-kin tabular-nums">−{formatPrice(discount.amount)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-washi-muted">Total</span>
                <span className="text-2xl font-bold tabular-nums">{formatPrice(total)}</span>
              </div>
              <p className="mt-0.5 text-sm text-washi-muted">
                Si elegís envío a domicilio, se suman {formatPrice(BUSINESS.delivery.fee)}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => leave(onCheckout)}
              // Closed: the notice above says when the shop opens
              disabled={!canOrder}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-washi font-bold text-sumi transition-colors hover:bg-washi/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi disabled:pointer-events-none disabled:opacity-40"
            >
              Continuar con el pedido
            </button>
          </div>
  );

  const body = (
    <>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {scheduleNotices.length > 0 && (
        <ul className="mt-4 space-y-2">
          {scheduleNotices.map((notice) => (
            <li key={notice.message} role="status" className="rounded-xl bg-washi px-4 py-3 text-sm leading-relaxed font-medium text-pretty text-sumi">
              {notice.message}
            </li>
          ))}
        </ul>
      )}

      {isEmpty ? (
        <>
          {removal && <ul>{rows}</ul>}
          {layout === 'panel' ? (
            // The menu is right beside it: no button to get there
            <div className="space-y-1 py-10 text-center">
              <p className="font-title text-xl">Tu pedido está vacío</p>
              <p className="text-sm text-pretty text-washi-muted">Tocá + en el menú para sumar lo que tengas ganas de comer.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="font-title text-2xl">Tu pedido está vacío</p>
              <p className="max-w-xs text-sm text-washi-muted">Explorá el menú y sumá lo que tengas ganas de comer.</p>
              <button
                type="button"
                onClick={() => leave(onClose)}
                className="mt-3 h-11 rounded-[10px] border border-hairline-strong px-4 text-sm font-bold transition-colors hover:border-washi hover:bg-sumi-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi"
              >
                Ver el menú
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <ul className="divide-y divide-hairline">{rows}</ul>
          <div className="flex min-h-15 items-center justify-end gap-2 border-t border-hairline py-2">
            {confirmingClear ? (
              <>
                <span className="mr-auto text-sm text-washi">¿Vaciar todo el pedido?</span>
                <button
                  type="button"
                  onClick={() => setConfirmingClear(false)}
                  className="h-11 rounded-[10px] px-3 text-sm font-bold text-washi-muted transition-colors hover:bg-sumi-2 hover:text-washi focus-visible:outline-2 focus-visible:outline-washi"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="h-11 rounded-[10px] border border-hairline-strong px-3.5 text-sm font-bold text-washi transition-colors hover:border-washi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi"
                >
                  Sí, vaciar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="h-11 rounded-[10px] px-3 text-sm font-bold text-washi-muted transition-colors hover:bg-sumi-2 hover:text-washi focus-visible:outline-2 focus-visible:outline-washi"
              >
                Vaciar pedido
              </button>
            )}
          </div>
          {/* Only while orders are taken: with the shop closed nothing can be added */}
          {canOrder && <CartSuggestions />}
        </>
      )}
    </>
  );

  if (layout === 'panel') {
    return (
      <section
        aria-labelledby={CART_PANEL_TITLE_ID}
        className="flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-2xl border border-hairline bg-sumi"
      >
        <h2
          id={CART_PANEL_TITLE_ID}
          tabIndex={-1}
          className="border-b border-hairline px-5 py-3 font-title text-2xl outline-none focus-visible:bg-sumi-1"
        >
          Tu pedido
        </h2>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5">{body}</div>
        {footer && <div className="border-t border-hairline px-5 pt-4 pb-5">{footer}</div>}
      </section>
    );
  }

  return (
    <Sheet open={open} onClose={() => leave(onClose)} title="Tu pedido" side="right" footer={footer}>
      {body}
    </Sheet>
  );
}
