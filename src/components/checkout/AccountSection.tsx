'use client';

import { Button } from '@/components/ui/Button';

interface AccountSectionProps {
  /** The logged-in email; null for a guest; undefined while it's being asked */
  email: string | null | undefined;
  onLogIn: () => void;
  onLogOut: () => void;
}

/** Guests order too: a quiet "¿Ya tenés cuenta? Ingresá", or "Pedís como …" with "Salir" once logged in */
export function AccountSection({ email, onLogIn, onLogOut }: AccountSectionProps) {
  if (email === undefined) return null;

  if (email === null) {
    return (
      <p className="text-sm text-washi-muted">
        ¿Ya tenés cuenta?{' '}
        <button
          type="button"
          onClick={onLogIn}
          className="-mx-1 inline-flex h-11 items-center rounded-[10px] px-1 font-bold text-washi underline underline-offset-4 transition hover:bg-sumi-2 focus-visible:outline-2 focus-visible:outline-washi"
        >
          Ingresá
        </button>
      </p>
    );
  }

  return (
    <section aria-label="Tu cuenta">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline px-4 py-2 text-sm">
        <p className="min-w-0 wrap-anywhere">
          Pedís como <strong>{email}</strong>
        </p>
        <Button variant="ghost" onClick={onLogOut}>
          Salir
        </Button>
      </div>
    </section>
  );
}
