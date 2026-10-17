'use client';

import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/ui/icons';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { TAG_LABELS } from '@/lib/labels';
import { getLineId, useCartStore } from '@/store/useCartStore';
import type { CustomComboProduct, Product, ProductVariant } from '@/types';

import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  onCustomize: (product: CustomComboProduct) => void;
}

interface LineActionProps {
  lineId: string;
  /** Accessible name, e.g. "Combo Kanituna · 24 piezas" */
  label: string;
  onAdd: () => void;
}

/** "Agregar" button, or a stepper once that exact line is in the cart */
function LineAction({ lineId, label, onAdd }: LineActionProps) {
  const quantity = useCartStore((state) => state.items.find((item) => item.lineId === lineId)?.quantity ?? 0);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  if (quantity > 0) {
    return (
      <QuantityStepper
        quantity={quantity}
        label={label}
        onDecrement={() => updateQuantity(lineId, quantity - 1)}
        onIncrement={onAdd}
      />
    );
  }

  return (
    <Button onClick={onAdd} aria-label={`Agregar ${label} al pedido`}>
      <PlusIcon width={16} height={16} />
      Agregar
    </Button>
  );
}

interface SizePickerProps {
  name: string;
  variants: readonly ProductVariant[];
  value: number;
  onChange: (pieces: number) => void;
}

function SizePicker({ name, variants, value, onChange }: SizePickerProps) {
  return (
    <fieldset>
      <legend className="sr-only">Tamaño de {name}</legend>
      <div className="grid grid-cols-3 gap-2">
        {variants.map((variant) => {
          const selected = variant.pieces === value;
          return (
            <label
              key={variant.pieces}
              className={cn(
                'cursor-pointer rounded-xl border px-2 py-2 text-center text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent',
                selected ? 'border-accent bg-accent/10 text-fg' : 'border-line text-muted hover:border-line-strong',
              )}
            >
              <input
                type="radio"
                name={`${name}-size`}
                checked={selected}
                onChange={() => onChange(variant.pieces)}
                className="sr-only"
              />
              <span className="font-medium tabular-nums">{variant.pieces}</span> piezas
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ProductCard({ product, onCustomize }: ProductCardProps) {
  // Sum over all lines of this product (custom combos can have several)
  const inCart = useCartStore((state) =>
    state.items.reduce((sum, item) => (item.product.id === product.id ? sum + item.quantity : sum), 0),
  );
  const addItem = useCartStore((state) => state.addItem);
  const [pieces, setPieces] = useState(product.type === 'sized' ? (product.variants[0]?.pieces ?? 0) : 0);

  let price: number;
  let picker: ReactNode = null;
  let action: ReactNode;

  switch (product.type) {
    case 'standard':
      price = product.price;
      action = <LineAction lineId={product.id} label={product.name} onAdd={() => addItem({ product })} />;
      break;
    case 'sized': {
      const variant = product.variants.find((v) => v.pieces === pieces);
      price = variant?.price ?? 0;
      picker = <SizePicker name={product.name} variants={product.variants} value={pieces} onChange={setPieces} />;
      action = (
        <LineAction
          lineId={getLineId(product.id, { pieces })}
          label={`${product.name} · ${pieces} piezas`}
          onAdd={() => addItem({ product, pieces })}
        />
      );
      break;
    }
    case 'custom-combo':
      price = product.price;
      action = <Button onClick={() => onCustomize(product)}>Armar combo</Button>;
      break;
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-colors hover:border-line-strong">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <ProductImage src={product.imageUrl} alt={product.name} />
        {product.tags && product.tags.length > 0 && (
          <ul className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {product.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-fg backdrop-blur-sm"
              >
                {TAG_LABELS[tag]}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex-1 space-y-1.5">
          {product.orderType === 'preorder' && (
            <p className="mb-3 inline-flex rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
              Solo con reserva anticipada
            </p>
          )}
          <h3 className="font-display text-2xl leading-tight font-medium">{product.name}</h3>
          {product.description && <p className="text-sm leading-relaxed text-muted">{product.description}</p>}
        </div>
        {picker}
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold tabular-nums">{formatPrice(price)}</p>
            {product.type !== 'standard' && inCart > 0 && (
              <p className="text-xs text-accent">{inCart} en tu pedido</p>
            )}
          </div>
          {action}
        </div>
      </div>
    </article>
  );
}
