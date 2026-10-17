'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { CloseIcon } from './icons';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** right: side drawer. bottom: bottom sheet on mobile, centered dialog from sm up. */
  side?: 'right' | 'bottom';
  children: ReactNode;
  footer?: ReactNode;
}

const SIDES = {
  right: 'inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-md open:animate-sheet-right',
  bottom: cn(
    'inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none rounded-t-3xl open:animate-sheet-up',
    'sm:inset-0 sm:m-auto sm:max-h-[85dvh] sm:max-w-lg sm:rounded-3xl sm:open:animate-dialog-in',
  ),
};

/** Modal panel on top of a native <dialog>: focus trap, Esc to close and top layer for free. */
export function Sheet({ open, onClose, title, side = 'right', children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // The dialog box is fully covered by its content, so a click on the dialog itself is a backdrop click
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'fixed overflow-hidden border border-line bg-surface p-0 text-fg shadow-2xl shadow-black/60',
        'backdrop:bg-black/70 backdrop:backdrop-blur-sm open:backdrop:animate-fade-in',
        SIDES[side],
      )}
    >
      <div className={cn('flex flex-col', side === 'right' ? 'h-full' : 'max-h-[inherit]')}>
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id={titleId} className="font-display text-2xl font-medium">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5">{children}</div>
        {footer && (
          <div className="border-t border-line px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
