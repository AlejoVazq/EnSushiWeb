import { cn } from '@/lib/cn';

import { MinusIcon, PlusIcon, TrashIcon } from './icons';

interface QuantityStepperProps {
  quantity: number;
  /** Product name, used in the buttons' accessible labels */
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
  className?: string;
}

const stepButton =
  'grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-accent';

/** At quantity 1 the minus button becomes a trash icon: decrementing removes the line. */
export function QuantityStepper({ quantity, label, onDecrement, onIncrement, className }: QuantityStepperProps) {
  const removes = quantity <= 1;

  return (
    <div className={cn('inline-flex items-center rounded-full border border-line bg-surface-2', className)}>
      <button
        type="button"
        onClick={onDecrement}
        aria-label={removes ? `Quitar ${label} del pedido` : `Quitar uno de ${label}`}
        className={stepButton}
      >
        {removes ? <TrashIcon width={16} height={16} /> : <MinusIcon width={16} height={16} />}
      </button>
      <span aria-live="polite" className="min-w-7 text-center text-sm font-semibold tabular-nums">
        {quantity}
      </span>
      <button type="button" onClick={onIncrement} aria-label={`Agregar uno más de ${label}`} className={stepButton}>
        <PlusIcon width={16} height={16} />
      </button>
    </div>
  );
}
