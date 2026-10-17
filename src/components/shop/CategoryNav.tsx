import { CATEGORIES } from '@/data/menu';

export function CategoryNav() {
  return (
    <nav
      aria-label="Categorías"
      className="sticky top-16 z-30 -mx-4 mb-10 border-b border-line/60 bg-canvas/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6"
    >
      <ul className="scrollbar-none flex gap-2 overflow-x-auto">
        {CATEGORIES.map((category) => (
          <li key={category.id} className="shrink-0">
            <a
              href={`#${category.id}`}
              className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              {category.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
