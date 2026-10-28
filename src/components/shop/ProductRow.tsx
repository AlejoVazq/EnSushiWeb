'use client';

import Image from 'next/image';
import { useState, type ReactNode } from 'react';

import { useIsAvailable } from '@/hooks/useLiveMenu';
import { useCanOrder, useSpecialDay } from '@/hooks/useScheduleStatus';
import { MENU_PHOTO_SIZES } from '@/hooks/useWarmMenuPhotos';
import { cn } from '@/lib/cn';
import { specialDayPrice } from '@/lib/discounts';
import { formatItemPrice, formatPrice } from '@/lib/format';
import { TAG_LABELS } from '@/lib/labels';
import { getLineId, useCartStore } from '@/store/useCartStore';
import type { Product, ProductIncludes } from '@/types';

import { ChevronRightIcon } from '@/components/ui/icons';

import { HollowSeal, LineAction, Seal, useLineQuantity } from './LineAction';
import { ProductSheet, type ProductLine } from './ProductSheet';

interface ProductRowProps {
  product: Product;
  /** The name opens a sheet with the photo and what the product has; the row leaves the description out */
  withSheet?: boolean;
}

/** "Incluye 2 salsas y 2 palitos" */
const formatIncludes = ({ salsas, palitos }: ProductIncludes): string => {
  const parts = [
    salsas > 0 && `${salsas} ${salsas === 1 ? 'salsa' : 'salsas'}`,
    palitos > 0 && `${palitos} ${palitos === 1 ? 'palito' : 'palitos'}`,
  ].filter(Boolean);
  return `Incluye ${parts.join(' y ')}`;
};

/** Gold seal next to a combo's name on a special day: "−15% hoy" (kin is only for discounts) */
function DiscountSeal({ percent }: { percent: number }) {
  return (
    <span className="inline-flex h-7 shrink-0 -rotate-3 items-center rounded-md bg-kin px-2 font-title text-sm whitespace-nowrap text-sumi">
      −{percent}% hoy
    </span>
  );
}

/** Small seal on a size or option chip: how many of that exact line are in the order */
function ChipSeal({ lineId }: { lineId: string }) {
  const quantity = useLineQuantity(lineId);
  if (quantity === 0) return null;
  return (
    <>
      <Seal quantity={quantity} className="absolute -top-2 -right-1.5 grid h-5 min-w-5 px-1 text-[0.6875rem]" />
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
                  : 'border-hairline-strong text-washi-muted',
                !selected && !disabled && 'hover:border-washi-muted hover:text-washi',
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

export function ProductRow({ product, withSheet = false }: ProductRowProps) {
  const soldOut = !useIsAvailable()(product);
  const canOrder = useCanOrder();
  const addItem = useCartStore((state) => state.addItem);
  // Special days take a percent off every Combo (not Arma tu combo); sold-out ones show no discount
  const specialDay = useSpecialDay();
  const discount = specialDay && product.categoryId === 'combos' && !soldOut ? specialDay : null;
  const [pieces, setPieces] = useState(product.type === 'sized' ? (product.variants[0]?.pieces ?? 0) : 0);
  const [optionId, setOptionId] = useState(
    product.type === 'standard' ? (product.option?.values[0]?.id ?? '') : '',
  );
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  let imageUrl = product.imageUrl;
  /** Shown next to the action; sized products carry their prices on the chips */
  let price: number | null = null;
  /** What comes with the chosen size (combos) */
  let includes: ProductIncludes | undefined;
  /** The option or size chips; the sheet gets its own copy, with its own radio group name */
  let renderPicker: ((name: string) => ReactNode) | null = null;
  let line: ProductLine;

  switch (product.type) {
    case 'standard': {
      price = product.price;
      if (!product.option) {
        line = { lineId: product.id, label: product.name, onAdd: () => addItem({ product }) };
        break;
      }
      const { option } = product;
      const optionValue = option.values.find((v) => v.id === optionId);
      imageUrl = optionValue?.imageUrl ?? product.imageUrl;
      renderPicker = (name) => (
        <ChoicePicker
          legend={`${option.name} de ${product.name}`}
          name={name}
          choices={option.values.map((v) => ({
            value: v.id,
            label: <span className="font-medium">{v.label}</span>,
            lineId: getLineId(product.id, { optionId: v.id }),
          }))}
          value={optionId}
          onChange={setOptionId}
          disabled={soldOut}
        />
      );
      line = {
        lineId: getLineId(product.id, { optionId }),
        label: `${product.name} · ${optionValue?.label ?? ''}`,
        onAdd: () => addItem({ product, optionId }),
      };
      break;
    }
    case 'sized': {
      includes = product.variants.find((v) => v.pieces === pieces)?.includes;
      renderPicker = (name) => (
        <ChoicePicker
          legend={`Tamaño de ${product.name}`}
          name={name}
          choices={product.variants.map((v) => ({
            value: v.pieces,
            label: (
              <>
                <span className="text-xs tabular-nums">{v.pieces} piezas</span>
                {discount ? (
                  <>
                    <s className="text-xs tabular-nums decoration-washi-muted">
                      <span className="sr-only">Antes </span>
                      {formatPrice(v.price)}
                    </s>
                    <span className="font-bold tabular-nums">
                      <span className="sr-only">Hoy </span>
                      {formatPrice(specialDayPrice(v.price, discount))}
                    </span>
                  </>
                ) : (
                  <span className="font-bold tabular-nums">{formatPrice(v.price)}</span>
                )}
              </>
            ),
            lineId: getLineId(product.id, { pieces: v.pieces }),
          }))}
          value={pieces}
          onChange={setPieces}
          disabled={soldOut}
        />
      );
      line = {
        lineId: getLineId(product.id, { pieces }),
        label: `${product.name} · ${pieces} piezas`,
        onAdd: () => addItem({ product, pieces }),
      };
      break;
    }
  }

  // No photo (or a broken file): the row stands as text, no placeholder
  const showImage = Boolean(imageUrl) && imageUrl !== failedSrc;
  // Next to the photo, three size chips don't fit a price in a row under 22rem (a phone, or a column of the
  // two-column grid): there they go full width, under the photo. The row's <li> is the container.
  const fullWidthOnNarrow = showImage && '@max-[22rem]:col-span-2';
  const openSheet = withSheet ? () => setSheetOpen(true) : undefined;

  const priceLabel =
    price !== null ? (
      <p className={cn('text-base font-bold tabular-nums', soldOut ? 'text-washi-muted' : 'text-washi')}>
        {formatItemPrice(price)}
      </p>
    ) : includes ? (
      <p className="text-sm text-washi-muted">{formatIncludes(includes)}</p>
    ) : (
      <span />
    );

  return (
    <article
      className={cn('grid gap-4 py-5', showImage && 'grid-cols-[5.5rem_1fr] @max-[22rem]:gap-y-3 @md:grid-cols-[6.5rem_1fr]')}
    >
      {showImage && imageUrl && (
        <div className={cn('relative aspect-square overflow-hidden rounded-xl bg-sumi-2', soldOut && 'opacity-40 grayscale')}>
          {/* The photo opens the sheet too; the name's button is the one for keyboards and screen readers */}
          {openSheet && (
            <button type="button" tabIndex={-1} aria-hidden onClick={openSheet} className="absolute inset-0 z-10 cursor-pointer" />
          )}
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes={MENU_PHOTO_SIZES}
            className="object-cover"
            onError={() => setFailedSrc(imageUrl)}
            // The error can fire before hydration attaches onError; catch already-broken images here
            ref={(img) => {
              if (img?.complete && img.naturalWidth === 0) setFailedSrc(imageUrl);
            }}
          />
        </div>
      )}

      <div className={cn('flex min-w-0 flex-col gap-3', showImage && '@max-[22rem]:contents')}>
        <div className="relative min-w-0 space-y-1">
          <h3
            className={cn(
              'font-title text-lg leading-snug text-balance wrap-anywhere sm:text-xl',
              soldOut ? 'text-washi-muted' : 'text-washi',
            )}
          >
            {discount ? (
              // Name and seal wrap as two pieces, so the seal never starts a line indented
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{product.name}</span>
                <DiscountSeal percent={discount.percent} />
              </span>
            ) : openSheet ? (
              // Covers the whole text block, so a tap anywhere on it opens the sheet
              <button
                type="button"
                onClick={openSheet}
                aria-haspopup="dialog"
                className="text-left after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-washi"
              >
                {product.name}
                <ChevronRightIcon className="ml-1 inline-block size-4 align-[-0.125em] text-washi-muted" />
                <span className="sr-only">: ver qué trae</span>
              </button>
            ) : (
              product.name
            )}
          </h3>
          {product.description && !withSheet && <p className="text-sm leading-relaxed text-pretty text-washi-muted">{product.description}</p>}
          {product.tags && product.tags.length > 0 && !withSheet && (
            <ul className="flex flex-wrap gap-1.5 pt-1">
              {product.tags.map((tag) => (
                <li key={tag} className="rounded-md border border-hairline px-2 py-0.5 text-xs font-medium text-washi-muted">
                  {TAG_LABELS[tag]}
                </li>
              ))}
            </ul>
          )}
        </div>
        {renderPicker && <div className={cn(fullWidthOnNarrow)}>{renderPicker(`${product.id}-choice`)}</div>}
        <div className={cn('flex min-h-11 items-center justify-between gap-3', fullWidthOnNarrow)}>
          {priceLabel}
          {soldOut ? <HollowSeal>Agotado hoy</HollowSeal> : canOrder ? <LineAction {...line} /> : null}
        </div>
      </div>

      {withSheet && (
        <ProductSheet
          product={product}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          imageUrl={showImage && imageUrl ? imageUrl : null}
          picker={renderPicker?.(`${product.id}-choice-sheet`) ?? null}
          price={priceLabel}
          priceText={price !== null ? formatItemPrice(price) : null}
          line={line}
          soldOut={soldOut}
          canOrder={canOrder}
        />
      )}
    </article>
  );
}
