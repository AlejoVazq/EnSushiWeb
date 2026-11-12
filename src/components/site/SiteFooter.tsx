import Image from 'next/image';
import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';

import { InstagramIcon, WhatsAppIcon } from '@/components/ui/icons';
import { BUSINESS } from '@/config/business';
import { CONSUMER_DEFENSE, LEGAL_PAGES } from '@/config/legal';
import { cn } from '@/lib/cn';
import { describeOpenDays } from '@/lib/schedule';

interface ContactButtonProps {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  name: string;
  detail: string;
}

/** Thumb-sized link with the data next to it, so it also works as plain contact info */
function ContactButton({ href, icon: Icon, name, detail }: ContactButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-16 items-center gap-3 rounded-2xl border border-hairline-strong bg-sumi-1 px-4 py-3 transition hover:border-washi hover:bg-sumi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi active:scale-[0.98]"
    >
      <Icon className="size-6.5 shrink-0" />
      <span className="min-w-0">
        <span className="block font-bold">{name}</span>
        <span className="block truncate text-sm text-washi-muted">{detail}</span>
      </span>
    </a>
  );
}

const labelClassName = 'text-xs text-washi-muted';
const linkClassName =
  'underline decoration-hairline-strong underline-offset-4 transition hover:decoration-washi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi';

interface SiteFooterProps {
  /** Extra room at the bottom on the menu, where the "Ver pedido" bar floats over the page */
  className?: string;
}

/** Contact, social and legal links, on the menu and on the legal pages */
export function SiteFooter({ className }: SiteFooterProps) {
  const { operatingHours } = BUSINESS.schedule;

  return (
    <footer className="border-t border-hairline">
      <div className={cn('mx-auto max-w-7xl px-4 pt-10 pb-10 sm:px-6', className)}>
        <div className="grid gap-6 md:grid-cols-2 md:items-start md:gap-12">
          <div>
            {/* The logo is white: tinted graphite on the light theme until there's a dark version */}
            <Image
              src="/logo.png"
              alt={BUSINESS.name}
              width={85}
              height={28}
              className="h-7 w-auto opacity-85 brightness-0"
            />
            <p className="mt-1 text-sm text-washi-muted">Sushi de autor en Arrecifes.</p>
            <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <dt className={labelClassName}>Retiro</dt>
                <dd className="mt-0.5">{BUSINESS.pickup.address}</dd>
              </div>
              <div>
                <dt className={labelClassName}>{describeOpenDays()}</dt>
                <dd className="mt-0.5 tabular-nums">
                  {operatingHours.open} a {operatingHours.close}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className={labelClassName}>Correo</dt>
                <dd className="mt-0.5 break-all">
                  <a href={`mailto:${BUSINESS.contact.email}`} className={linkClassName}>
                    {BUSINESS.contact.email}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <ContactButton
              href={`https://wa.me/${BUSINESS.whatsappNumber}`}
              icon={WhatsAppIcon}
              name="WhatsApp"
              detail={BUSINESS.whatsappDisplay}
            />
            <ContactButton
              href={BUSINESS.contact.instagram.url}
              icon={InstagramIcon}
              name="Instagram"
              detail={BUSINESS.contact.instagram.handle}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-hairline pt-4 md:flex-row md:items-start md:justify-between">
          <nav aria-label="Información legal">
            <ul className="flex flex-wrap gap-x-5 text-sm text-washi-muted">
              {LEGAL_PAGES.map((page) => (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    className="inline-flex min-h-11 items-center transition hover:text-washi hover:underline focus-visible:outline-2 focus-visible:outline-washi"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href={CONSUMER_DEFENSE.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center transition hover:text-washi hover:underline focus-visible:outline-2 focus-visible:outline-washi"
                >
                  {CONSUMER_DEFENSE.label}
                </a>
              </li>
            </ul>
          </nav>
          <p className="shrink-0 text-xs text-washi-muted md:pt-3.5">© 2026 {BUSINESS.name}</p>
        </div>
      </div>
    </footer>
  );
}
