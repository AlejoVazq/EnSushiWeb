'use client';

import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/ui/icons';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { formatPrice } from '@/lib/format';
import { TAG_LABELS } from '@/lib/labels';
import { getLineId, useCartStore } from '@/store/useCartStore';
import type { CustomComboProduct, Product } from '@/types';

import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  onCustomize: (product: CustomComboProduct) => void;
}

export function ProductCard({ product, onCustomize }: ProductCardProps) {
  // Sum over all lines of this product (custom combos can have several)
  const inCart = useCartStore((state) =>
    state.items.reduce((sum, item) => (item.product.id === product.id ? sum + item.quantity : sum), 0),
  );
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const action =
    product.type === 'custom-combo' ? (
      <Button onClick={() => onCustomize(product)}>Armar combo</Button>
    ) : inCart > 0 ? (
      <QuantityStepper
        quantity={inCart}
        label={product.name}
        onDecrement={() => updateQuantity(getLineId(product.id), inCart - 1)}
        onIncrement={() => addItem({ product })}
      />
    ) : (
      <Button onClick={() => addItem({ product })} aria-label={`Agregar ${product.name} al pedido`}>
        <PlusIcon width={16} height={16} />
        Agregar
      </Button>
    );

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
          <h3 className="font-display text-2xl leading-tight font-medium">{product.name}</h3>
          <p className="text-sm leading-relaxed text-muted">{product.description}</p>
        </div>
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold tabular-nums">{formatPrice(product.price)}</p>
            {product.type === 'custom-combo' && inCart > 0 && (
              <p className="text-xs text-accent">{inCart} en tu pedido</p>
            )}
          </div>
          {action}
        </div>
      </div>
    </article>
  );
}
