import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/site/SiteFooter';
import { BUSINESS } from '@/config/business';
import { LEGAL_PAGES, LEGAL_UPDATED, type LegalPageLink } from '@/config/legal';
import { cn } from '@/lib/cn';

interface LegalPageProps {
  href: LegalPageLink['href'];
  children: ReactNode;
}

/** Reading layout shared by the four legal pages: small header, title, nav between them, text, footer */
export function LegalPage({ href, children }: LegalPageProps) {
  const page = LEGAL_PAGES.find((p) => p.href === href);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hairline bg-sumi">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-washi">
            <Image
              src="/logo.png"
              alt={`${BUSINESS.name}: ir al menú`}
              width={79}
              height={26}
              className="h-6.5 w-auto opacity-85 brightness-0"
            />
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-1 rounded-[10px] px-2 text-sm font-bold transition hover:bg-sumi-2 focus-visible:outline-2 focus-visible:outline-washi"
          >
            <span aria-hidden>‹</span> Volver al menú
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 pb-14 sm:px-6 sm:pt-12">
        <article className="max-w-180 animate-panel-in">
          <h1 className="font-title text-3xl leading-tight text-balance sm:text-4xl">{page?.title}</h1>
          <p className="mt-1.5 text-sm text-washi-muted">Actualizada el {LEGAL_UPDATED}</p>

          <nav aria-label="Páginas legales" className="mt-5 mb-8">
            <ul className="flex flex-wrap gap-2">
              {LEGAL_PAGES.map((p) => {
                const current = p.href === href;
                return (
                  <li key={p.href}>
                    <Link
                      href={p.href}
                      aria-current={current ? 'page' : undefined}
                      className={cn(
                        'inline-flex h-9 items-center rounded-full border px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi',
                        current
                          ? 'border-washi font-bold text-washi'
                          : 'border-hairline text-washi-muted hover:border-hairline-strong hover:text-washi',
                      )}
                    >
                      {p.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div
            className={cn(
              'max-w-[65ch] text-pretty text-washi',
              '[&_h2]:mt-9 [&_h2]:mb-2 [&_h2]:font-title [&_h2]:text-xl [&_h2]:leading-snug [&_h2]:text-balance',
              '[&_p]:mt-3 [&_p]:leading-relaxed [&_li]:mt-1.5 [&_li]:leading-relaxed',
              '[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:marker:text-washi-muted',
              '[&_a]:underline [&_a]:decoration-hairline-strong [&_a]:underline-offset-4 [&_a:hover]:decoration-washi',
              '[&_strong]:font-bold',
            )}
          >
            {children}
          </div>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
