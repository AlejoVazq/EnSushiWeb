'use client';

import { getBuildItemsByGroup, getProductsByCategory } from '@/data/menu';
import { getNow } from '@/lib/schedule';
import { formatUnits } from '@/lib/cartLine';
import { formatPrice } from '@/lib/format';
import { getExtraLineId, getLineId, useCartStore } from '@/store/useCartStore';
import type { StandardProduct } from '@/types';

import { LineAction } from './LineAction';

interface SuggestionCardProps {
  name: string;
  detail: string;
  lineId: string;
  /** Accessible name for the add / quantity buttons */
  label: string;
  onAdd: () => void;
}

function SuggestionCard({ name, detail, lineId, label, onAdd }: SuggestionCardProps) {
  return (
    <li className="flex w-44 shrink-0 snap-start flex-col justify-between gap-3 rounded-xl border border-hairline p-3">
      <div>
        <p className="font-title text-base leading-snug text-washi">{name}</p>
        <p className="text-sm text-washi-muted tabular-nums">{detail}</p>
      </div>
      <div className="flex justify-end">
        <LineAction lineId={lineId} label={label} onAdd={onAdd} />
      </div>
    </li>
  );
}

const isPlainProduct = (product: { type: string }): product is StandardProduct => product.type === 'standard';

/** "¿Le sumás algo?": acompañamientos and salsas, one tap away before checking out (like a fast-food app's upsell) */
export function CartSuggestions() {
  const addExtra = useCartStore((state) => state.addExtra);
  const addItem = useCartStore((state) => state.addItem);

  const extras = getBuildItemsByGroup('acompanamientos').filter((item) => item.available);
  // Salsas without a required option can be added straight away
  const salsas = getProductsByCategory('salsas', getNow()).filter(isPlainProduct).filter((product) => !product.option);
  if (extras.length + salsas.length === 0) return null;

  return (
    <section aria-labelledby="cart-suggestions" className="border-t border-hairline py-4">
      <h3 id="cart-suggestions" className="font-title text-lg text-washi">
        ¿Le sumás algo?
      </h3>
      <p className="mb-3 text-sm text-washi-muted">Acompañamientos y salsas para tu pedido.</p>
      <ul className="scrollbar-none -mx-5 flex snap-x gap-3 overflow-x-auto scroll-px-5 px-5 pb-1">
        {extras.map((item) => (
          <SuggestionCard
            key={item.id}
            name={item.name}
            detail={`${formatUnits(item.step, item.unitLabel)} · ${formatPrice(item.price)}`}
            lineId={getExtraLineId(item.id)}
            label={`${item.name} (${formatUnits(item.step, item.unitLabel)})`}
            onAdd={() => addExtra(item.id)}
          />
        ))}
        {salsas.map((product) => (
          <SuggestionCard
            key={product.id}
            name={product.name}
            detail={formatPrice(product.price)}
            lineId={getLineId(product.id)}
            label={product.name}
            onAdd={() => addItem({ product })}
          />
        ))}
      </ul>
    </section>
  );
}
