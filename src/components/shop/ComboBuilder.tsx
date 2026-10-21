'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { CheckIcon } from '@/components/ui/icons';
import { Sheet } from '@/components/ui/Sheet';
import { getCustomCombos, ROLL_FLAVORS } from '@/data/menu';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { useCartStore } from '@/store/useCartStore';
import type { CustomComboProduct } from '@/types';

interface ComboBuilderProps {
  open: boolean;
  /** Size preselected when the builder opens; remount (key) to reset the selection */
  initialProduct: CustomComboProduct;
  onClose: () => void;
}

/** Interim Arma tu combo: pick a size, then 1..maxFlavors flavors. Price is fixed by size. */
export function ComboBuilder({ open, initialProduct, onClose }: ComboBuilderProps) {
  const sizes = getCustomCombos();
  const [productId, setProductId] = useState(initialProduct.id);
  const [flavorIds, setFlavorIds] = useState<string[]>([]);
  const addItem = useCartStore((state) => state.addItem);

  const product = sizes.find((p) => p.id === productId) ?? initialProduct;
  const isFull = flavorIds.length >= product.maxFlavors;

  const selectSize = (next: CustomComboProduct) => {
    setProductId(next.id);
    setFlavorIds((ids) => ids.slice(0, next.maxFlavors));
  };

  const toggleFlavor = (id: string) =>
    setFlavorIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < product.maxFlavors ? [...ids, id] : ids,
    );

  const handleAdd = () => {
    addItem({ product, flavorIds });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Armá tu combo"
      side="bottom"
      footer={
        <Button size="lg" fullWidth disabled={flavorIds.length === 0} onClick={handleAdd}>
          {flavorIds.length === 0
            ? 'Elegí al menos un sabor'
            : `Agregar al pedido · ${formatPrice(product.price)}`}
        </Button>
      }
    >
      <div className="space-y-8 py-6">
        <fieldset className="space-y-3">
          <legend className="mb-3 text-sm font-medium text-muted">Tamaño</legend>
          <div className="grid grid-cols-2 gap-3">
            {sizes.map((size) => {
              const selected = size.id === product.id;
              return (
                <label
                  key={size.id}
                  className={cn(
                    'cursor-pointer rounded-2xl border p-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent',
                    selected ? 'border-accent bg-accent/10' : 'border-line bg-surface-2 hover:border-line-strong',
                  )}
                >
                  <input
                    type="radio"
                    name="combo-size"
                    value={size.id}
                    checked={selected}
                    onChange={() => selectSize(size)}
                    className="sr-only"
                  />
                  <span className="block font-display text-2xl font-medium">{size.pieces} piezas</span>
                  <span className="block text-sm text-muted">Hasta {size.maxFlavors} sabores</span>
                  <span className="mt-2 block font-semibold tabular-nums">{formatPrice(size.price)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 flex w-full items-baseline justify-between text-sm font-medium text-muted">
            <span>Sabores · elegí de 1 a {product.maxFlavors}</span>
            <span aria-live="polite" className={cn('tabular-nums', isFull ? 'text-accent' : 'text-subtle')}>
              {flavorIds.length}/{product.maxFlavors}
            </span>
          </legend>
          <ul className="space-y-2">
            {ROLL_FLAVORS.map((flavor) => {
              const checked = flavorIds.includes(flavor.id);
              const disabled = isFull && !checked;
              return (
                <li key={flavor.id}>
                  <label
                    className={cn(
                      'flex items-center gap-4 rounded-2xl border p-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent',
                      checked ? 'border-accent bg-accent/10' : 'border-line bg-surface-2',
                      disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:border-line-strong',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleFlavor(flavor.id)}
                      className="sr-only"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{flavor.name}</span>
                      <span className="block text-sm text-muted">{flavor.description}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full border',
                        checked ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong',
                      )}
                    >
                      {checked && <CheckIcon width={14} height={14} strokeWidth={2.5} />}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>
    </Sheet>
  );
}
