'use client';

import { useRef, type KeyboardEvent } from 'react';

import { MENU_CATEGORIES } from '@/data/menu';
import { cn } from '@/lib/cn';
import type { CategoryId } from '@/types';

interface CategoryNavProps {
  active: CategoryId;
  onSelect: (id: CategoryId) => void;
}

export const categoryTabId = (id: CategoryId): string => `tab-${id}`;

/** Category tabs: only the selected category is shown below */
export function CategoryNav({ active, onSelect }: CategoryNavProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Arrow keys move between tabs (WAI-ARIA tabs pattern)
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = MENU_CATEGORIES.findIndex((c) => c.id === active);
    const next = MENU_CATEGORIES[(index + step + MENU_CATEGORIES.length) % MENU_CATEGORIES.length];
    if (!next) return;
    onSelect(next.id);
    listRef.current?.querySelector<HTMLElement>(`#${categoryTabId(next.id)}`)?.focus();
  };

  return (
    <nav
      aria-label="Categorías"
      className="sticky top-14 z-30 -mx-4 mb-8 border-b border-hairline bg-sumi px-4 sm:-mx-6 sm:px-6"
    >
      <div
        ref={listRef}
        role="tablist"
        aria-label="Categorías del menú"
        onKeyDown={handleKeyDown}
        className="scrollbar-none -mx-2 flex gap-3 overflow-x-auto max-sm:mask-r-from-[calc(100%-2rem)]"
      >
        {MENU_CATEGORIES.map((category) => {
          const selected = category.id === active;
          return (
            <button
              key={category.id}
              id={categoryTabId(category.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={category.id}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(category.id)}
              className={cn(
                'inline-flex h-12 shrink-0 items-center px-2 text-[0.9375rem] transition-colors',
                'focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-washi',
                selected
                  ? 'font-bold text-washi shadow-[inset_0_-2px_0_currentColor]'
                  : 'font-medium text-washi-muted hover:text-washi',
              )}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
