'use client';

import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/ui/icons';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { BUSINESS } from '@/config/business';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { TAG_LABELS } from '@/lib/labels';
import { getLineId, useCartStore } from '@/store/useCartStore';
import type { CustomComboProduct, Product } from '@/types';

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

interface Choice<T extends string | number> {
  value: T;
  label: ReactNode;
}

interface ChoicePickerProps<T extends string | number> {
  /** Accessible name of the group, e.g. "Tamaño de Combo Kanituna" */
  legend: string;
  /** Unique radio group name */
  name: string;
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Segmented radio group: combo sizes, raw or cooked, etc. */
function ChoicePicker<T extends string | number>({ legend, name, choices, value, onChange }: ChoicePickerProps<T>) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className={cn('grid gap-2', choices.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <label
              key={choice.value}
              className={cn(
                'cursor-pointer rounded-xl border px-2 py-2 text-center text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent',
                selected ? 'border-accent bg-accent/10 text-fg' : 'border-line text-muted hover:border-line-strong',
              )}
            >
              <input
                type="radio"
                name={name}
                checked={selected}
                onChange={() => onChange(choice.value)}
                className="sr-only"
              />
              {choice.label}
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
  const [optionId, setOptionId] = useState(
    product.type === 'standard' ? (product.option?.values[0]?.id ?? '') : '',
  );

  let price: number;
  let imageUrl = product.imageUrl;
  let picker: ReactNode = null;
  let action: ReactNode;

  switch (product.type) {
    case 'standard': {
      price = product.price;
      if (!product.option) {
        action = <LineAction lineId={product.id} label={product.name} onAdd={() => addItem({ product })} />;
        break;
      }
      const optionValue = product.option.values.find((v) => v.id === optionId);
      imageUrl = optionValue?.imageUrl ?? product.imageUrl;
      picker = (
        <ChoicePicker
          legend={`${product.option.name} de ${product.name}`}
          name={`${product.id}-option`}
          choices={product.option.values.map((v) => ({ value: v.id, label: v.label }))}
          value={optionId}
          onChange={setOptionId}
        />
      );
      action = (
        <LineAction
          lineId={getLineId(product.id, { optionId })}
          label={`${product.name} · ${optionValue?.label ?? ''}`}
          onAdd={() => addItem({ product, optionId })}
        />
      );
      break;
    }
    case 'sized': {
      const variant = product.variants.find((v) => v.pieces === pieces);
      price = variant?.price ?? 0;
      picker = (
        <ChoicePicker
          legend={`Tamaño de ${product.name}`}
          name={`${product.id}-size`}
          choices={product.variants.map((v) => ({
            value: v.pieces,
            label: (
              <>
                <span className="font-medium tabular-nums">{v.pieces}</span> piezas
              </>
            ),
          }))}
          value={pieces}
          onChange={setPieces}
        />
      );
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
        <ProductImage src={imageUrl} alt={product.name} />
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
              Rolls y nigiris hasta las {BUSINESS.schedule.preorderCutoff}
            </p>
          )}
          <h3 className="font-display text-2xl leading-tight font-medium">{product.name}</h3>
          {product.description && <p className="text-sm leading-relaxed text-muted">{product.description}</p>}
        </div>
        {picker}
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold tabular-nums">{formatPrice(price)}</p>
            {(product.type !== 'standard' || product.option) && inCart > 0 && (
              <p className="text-xs text-accent">{inCart} en tu pedido</p>
            )}
          </div>
          {action}
        </div>
      </div>
    </article>
  );
}
