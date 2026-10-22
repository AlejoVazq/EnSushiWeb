'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Sheet } from '@/components/ui/Sheet';
import { getLineDetail, getLineName } from '@/lib/cartLine';
import { useCartNotices, useScheduleStatus } from '@/hooks/useScheduleStatus';
import { formatPrice } from '@/lib/format';
import { lineSubtotal, selectCartTotal, useCartStore } from '@/store/useCartStore';
import type { BoxCartItem, CartItem } from '@/types';

import { ScheduleNotices } from './ScheduleNotices';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  /** Opens Arma tu combo with this box loaded */
  onEditBox: (item: BoxCartItem) => void;
}

interface CartLineProps {
  item: CartItem;
  /** Set for boxes that can still be edited (before the rolls and nigiris cutoff) */
  onEdit?: () => void;
}

function CartLine({ item, onEdit }: CartLineProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const detail = getLineDetail(item);
  const name = getLineName(item);

  return (
    <li className="flex gap-4 py-5">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="leading-snug font-medium">{name}</p>
        {detail && <p className="text-sm text-muted">{detail}</p>}
        <p className="text-sm text-muted tabular-nums">{formatPrice(item.unitPrice)} c/u</p>
        {onEdit && (
          <Button variant="secondary" size="sm" className="mt-2" onClick={onEdit} aria-label={`Editar ${name}`}>
            Editar
          </Button>
        )}
      </div>
      <div className="flex flex-col items-end gap-3">
        <p className="font-semibold tabular-nums">{formatPrice(lineSubtotal(item))}</p>
        <QuantityStepper
          quantity={item.quantity}
          label={name}
          onDecrement={() => updateQuantity(item.lineId, item.quantity - 1)}
          onIncrement={() => updateQuantity(item.lineId, item.quantity + 1)}
        />
      </div>
    </li>
  );
}

export function CartDrawer({ open, onClose, onCheckout, onEditBox }: CartDrawerProps) {
  const items = useCartStore((state) => state.items);
  const total = useCartStore(selectCartTotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const scheduleNotices = useCartNotices();
  // Past the cutoff the rolls and nigiris of a box can't change, so it can only be kept or removed
  const canEditBoxes = !useScheduleStatus()?.isPastPreorderCutoff;
  const [confirmingClear, setConfirmingClear] = useState(false);

  const isEmpty = items.length === 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Tu pedido"
      side="right"
      footer={
        isEmpty ? undefined : (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-muted">Total</span>
              <span className="text-2xl font-semibold tabular-nums">{formatPrice(total)}</span>
            </div>
            <ScheduleNotices notices={scheduleNotices} />
            <Button size="lg" fullWidth onClick={onCheckout}>
              Continuar con el pedido
            </Button>
          </div>
        )
      }
    >
      {isEmpty ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="font-display text-2xl font-medium">Tu pedido está vacío</p>
          <p className="max-w-xs text-sm text-muted">Explorá el menú y sumá lo que tengas ganas de comer.</p>
          <Button variant="secondary" className="mt-3" onClick={onClose}>
            Ver el menú
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <CartLine
                key={item.lineId}
                item={item}
                onEdit={item.kind === 'box' && canEditBoxes ? () => onEditBox(item) : undefined}
              />
            ))}
          </ul>
          <div className="flex items-center justify-end gap-2 border-t border-line py-4">
            {confirmingClear ? (
              <>
                <span className="mr-auto text-sm text-muted">¿Vaciar todo el pedido?</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingClear(false)}>
                  No
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    clearCart();
                    setConfirmingClear(false);
                  }}
                >
                  Sí, vaciar
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setConfirmingClear(true)}>
                Vaciar pedido
              </Button>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}
