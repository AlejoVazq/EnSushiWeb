'use client';

import { getBuildItemsByGroup } from '@/data/menu';
import { useCanOrder } from '@/hooks/useScheduleStatus';
import { formatUnits } from '@/lib/cartLine';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { getExtraLineId, useCartStore } from '@/store/useCartStore';
import type { BuildItem } from '@/types';

import { HollowSeal, LineAction } from './LineAction';

/** An acompañamiento as a menu row: name, portion and price, and the same "+" / seal as any product */
export function ExtraRow({ item }: { item: BuildItem }) {
  const addExtra = useCartStore((state) => state.addExtra);
  const canOrder = useCanOrder();

  return (
    <div className="flex min-h-19 items-center justify-between gap-4 py-4">
      <div className={cn('min-w-0', !item.available && 'opacity-60')}>
        <h3 className={cn('font-title text-lg leading-snug wrap-anywhere sm:text-xl', item.available ? 'text-washi' : 'text-washi-muted')}>
          {item.name}
        </h3>
        <p className="text-sm text-washi-muted tabular-nums">
          {formatUnits(item.step, item.unitLabel)} · {formatPrice(item.price)}
        </p>
      </div>
      {!item.available ? (
        <HollowSeal>Agotado hoy</HollowSeal>
      ) : canOrder ? (
        <LineAction
          lineId={getExtraLineId(item.id)}
          label={`${item.name} (${formatUnits(item.step, item.unitLabel)})`}
          onAdd={() => addExtra(item.id)}
        />
      ) : null}
    </div>
  );
}

/** The Acompañamientos tab: build items ordered on their own, no cutoff */
export function ExtrasList() {
  const items = getBuildItemsByGroup('acompanamientos');

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-hairline px-6 py-10 text-center text-washi-muted">
        Hoy no hay nada disponible en esta sección. ¡Volvé mañana!
      </p>
    );
  }

  return (
    <ul className="grid border-t border-hairline lg:grid-cols-2 lg:gap-x-12">
      {items.map((item) => (
        <li key={item.id} className="border-b border-hairline">
          <ExtraRow item={item} />
        </li>
      ))}
    </ul>
  );
}
