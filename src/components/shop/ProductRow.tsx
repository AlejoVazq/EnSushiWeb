'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';

import { useCanOrder } from '@/hooks/useScheduleStatus';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { TAG_LABELS } from '@/lib/labels';
import { getLineId, useCartStore } from '@/store/useCartStore';
import type { Product } from '@/types';

import { HollowSeal, LineAction, Seal, useLineQuantity } from './LineAction';

interface ProductRowProps {
  product: Product;
}

/** Small seal on a size or option chip: how many of that exact line are in the order */
function ChipSeal({ lineId }: { lineId: string }) {
  const quantity = useLineQuantity(lineId);
  if (quantity === 0) return null;
  return (
    <>
      <Seal quantity={quantity} className="absolute -top-2 -right-1.5 grid h-5 min-w-5 px-1 text-[11px]" />
      <span className="sr-only">, {quantity} en tu pedido</span>
    </>
  );
}

interface Choice<T extends string | number> {
  value: T;
  label: ReactNode;
  lineId: string;
}

interface ChoicePickerProps<T extends string | number> {
  /** Accessible name of the group, e.g. "Tamaño de Combo Kanituna" */
  legend: string;
  /** Unique radio group name */
  name: string;
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled: boolean;
}

/** Segmented radio group: combo sizes, raw or cooked, etc. */
function ChoicePicker<T extends string | number>({
  legend,
  name,
  choices,
  value,
  onChange,
  disabled,
}: ChoicePickerProps<T>) {
  return (
    <fieldset disabled={disabled} className="disabled:opacity-40">
      <legend className="sr-only">{legend}</legend>
      <div className={cn('grid gap-2', choices.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <label
              key={choice.value}
              className={cn(
                'relative flex min-h-11 cursor-pointer flex-col in-disabled:cursor-default items-center justify-center rounded-lg border px-2 py-1.5 text-center text-sm leading-tight transition-colors',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-washi',
                selected && !disabled
                  ? 'border-washi bg-sumi-2 text-washi'
                  : 'border-hairline text-washi-muted',
                !selected && !disabled && 'hover:border-hairline-strong hover:text-washi',
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
              <ChipSeal lineId={choice.lineId} />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ProductRow({ product }: ProductRowProps) {
  const soldOut = !product.available;
  const canOrder = useCanOrder();
  const addItem = useCartStore((state) => state.addItem);
  const [pieces, setPieces] = useState(product.type === 'sized' ? (product.variants[0]?.pieces ?? 0) : 0);
  const [optionId, setOptionId] = useState(
    product.type === 'standard' ? (product.option?.values[0]?.id ?? '') : '',
  );
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  let imageUrl = product.imageUrl;
  /** Shown next to the action; sized products carry their prices on the chips */
  let price: number | null = null;
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
          choices={product.option.values.map((v) => ({
            value: v.id,
            label: <span className="font-medium">{v.label}</span>,
            lineId: getLineId(product.id, { optionId: v.id }),
          }))}
          value={optionId}
          onChange={setOptionId}
          disabled={soldOut}
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
      picker = (
        <ChoicePicker
          legend={`Tamaño de ${product.name}`}
          name={`${product.id}-size`}
          choices={product.variants.map((v) => ({
            value: v.pieces,
            label: (
              <>
                <span className="text-xs tabular-nums">{v.pieces} piezas</span>
                <span className="font-bold tabular-nums">{formatPrice(v.price)}</span>
              </>
            ),
            lineId: getLineId(product.id, { pieces: v.pieces }),
          }))}
          value={pieces}
          onChange={setPieces}
          disabled={soldOut}
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
  }

  // No photo (or a broken file): the row stands as text, no placeholder
  const showImage = Boolean(imageUrl) && imageUrl !== failedSrc;

  return (
    <article className={cn('grid gap-4 py-5', showImage && 'grid-cols-[5.5rem_1fr] sm:grid-cols-[6.5rem_1fr]')}>
      {showImage && imageUrl && (
        <div className={cn('relative aspect-square overflow-hidden rounded-xl bg-sumi-2', soldOut && 'opacity-40 grayscale')}>
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 640px) 104px, 88px"
            className="object-cover"
            onError={() => setFailedSrc(imageUrl)}
            // The error can fire before hydration attaches onError; catch already-broken images here
            ref={(img) => {
              if (img?.complete && img.naturalWidth === 0) setFailedSrc(imageUrl);
            }}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-3">
        <div className="space-y-1">
          <h3
            className={cn(
              'font-title text-lg leading-snug text-balance sm:text-xl',
              soldOut ? 'text-washi-muted' : 'text-washi',
            )}
          >
            {product.name}
          </h3>
          {product.description && <p className="text-sm leading-relaxed text-pretty text-washi-muted">{product.description}</p>}
          {product.tags && product.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 pt-1">
              {product.tags.map((tag) => (
                <li key={tag} className="rounded-md border border-hairline px-2 py-0.5 text-xs font-medium text-washi-muted">
                  {TAG_LABELS[tag]}
                </li>
              ))}
            </ul>
          )}
        </div>
        {picker}
        <div className="flex min-h-11 items-center justify-between gap-3">
          {price !== null ? (
            <p className={cn('text-base font-bold tabular-nums', soldOut ? 'text-washi-muted' : 'text-washi')}>
              {formatPrice(price)}
            </p>
          ) : (
            <span />
          )}
          {soldOut ? <HollowSeal>Agotado hoy</HollowSeal> : canOrder ? action : null}
        </div>
      </div>
    </article>
  );
}
