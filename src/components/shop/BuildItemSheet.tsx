'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

import { MinusIcon, PlusIcon } from '@/components/ui/icons';
import { Sheet } from '@/components/ui/Sheet';
import { BUSINESS } from '@/config/business';
import { useIsAvailable } from '@/hooks/useLiveMenu';
import { formatUnits } from '@/lib/cartLine';
import { formatPrice } from '@/lib/format';
import type { BuildItem } from '@/types';

import { HollowSeal, stepButtonClassName } from './LineAction';
import { ItemDrawing } from './ItemDrawing';

const { preorderCutoff } = BUSINESS.schedule;

const plateClassName =
  'flex h-14 w-full items-center justify-center rounded-2xl bg-washi px-4 font-bold text-sumi tabular-nums transition-colors hover:bg-washi/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi disabled:pointer-events-none disabled:opacity-40';

interface BuildItemSheetProps {
  /** Last item opened: kept while the sheet closes so its content doesn't vanish mid-animation */
  item: BuildItem | null;
  open: boolean;
  onClose: () => void;
  steps: number;
  /** One more step still leads to a box that fits */
  fits: boolean;
  /** Past the preorder cutoff */
  blocked: boolean;
  /** The shop isn't taking orders: view-only */
  closed: boolean;
  needsSize: boolean;
  onChange: (steps: number) => void;
  /** Takes the customer to the size picker (the sheet closes first) */
  onNeedSize: () => void;
}

/** What a roll or nigiri is made of (its photo, or the drawing), with the same controls as its row */
export function BuildItemSheet({ item, open, onClose, steps, fits, blocked, closed, needsSize, onChange, onNeedSize }: BuildItemSheetProps) {
  const isAvailable = useIsAvailable();
  if (!item) return null;
  const units = formatUnits(item.step, item.unitLabel);

  let action: ReactNode = null;
  // Already in the box when it sold out: the row's stepper takes it out
  if (!isAvailable(item)) action = <HollowSeal>Agotado hoy</HollowSeal>;
  else if (closed) action = null;
  else if (blocked) action = <HollowSeal>Hasta las {preorderCutoff}</HollowSeal>;
  else if (needsSize)
    action = (
      <button type="button" onClick={onNeedSize} className={plateClassName}>
        Elegí la caja
      </button>
    );
  else if (steps === 0)
    action = (
      <button type="button" onClick={() => onChange(1)} disabled={!fits} className={plateClassName}>
        {fits ? `Sumar ${units} · ${formatPrice(item.price)}` : 'Ya no entra en la caja'}
      </button>
    );
  else
    action = (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(steps - 1)}
            aria-label={`Sacar ${units} de ${item.name}`}
            className={stepButtonClassName}
          >
            <MinusIcon />
          </button>
          <span className="grid min-w-11 place-items-center font-title text-lg text-washi tabular-nums">
            {item.step * steps}
            <span className="sr-only"> {item.unitLabel} de {item.name} en la caja</span>
          </span>
          <button
            type="button"
            onClick={() => onChange(steps + 1)}
            disabled={!fits}
            aria-label={`Sumar ${units} más de ${item.name}`}
            className={stepButtonClassName}
          >
            <PlusIcon />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-14 flex-1 rounded-2xl border border-hairline-strong font-bold text-washi transition-colors hover:border-washi hover:bg-sumi-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi"
        >
          Listo
        </button>
      </div>
    );

  const footer = (
    <div className="space-y-3">
      <p className="flex items-baseline justify-between gap-4 text-sm text-washi-muted tabular-nums">
        <span>{steps > 0 ? `${formatUnits(item.step * steps, item.unitLabel)} en la caja` : item.step === 1 ? 'Por unidad' : `De a ${units}`}</span>
        <span className="text-base font-bold text-washi">{formatPrice(item.price * Math.max(steps, 1))}</span>
      </p>
      {action}
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title={item.name} side="bottom" footer={footer}>
      <div className="space-y-4 py-4">
        {item.imageUrl ? (
          <div className="relative aspect-square overflow-hidden rounded-xl bg-sumi-2">
            <Image
              src={item.imageUrl}
              alt={item.description ?? item.name}
              fill
              sizes="(min-width: 640px) 470px, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          item.drawing && (
            <div className="rounded-xl bg-sumi-1 px-1 py-2">
              <ItemDrawing drawing={item.drawing} description={item.description ?? item.name} seed={item.id} />
            </div>
          )
        )}
        {item.description && <p className="leading-relaxed text-pretty text-washi">{item.description}</p>}
      </div>
    </Sheet>
  );
}
