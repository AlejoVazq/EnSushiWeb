'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { getAccount, logOut } from '@/lib/pedidosApp';
import type { CustomerAccount } from '@/types/pedidos';

import { LoginSheet } from './LoginSheet';

type Step = { name: 'loading' } | { name: 'out' } | { name: 'in'; email: string };

interface AccountSectionProps {
  /** The logged-in account (with its last order's details, to fill the form), or null while there's none */
  onChange: (account: CustomerAccount | null) => void;
}

/**
 * Orders by app need a verified email. The cart asks for it (LoginSheet) before coming here, so this is
 * usually just "Pedís como …"; a phone that arrives without a session gets the same sheet from here.
 */
export function AccountSection({ onChange }: AccountSectionProps) {
  const [step, setStep] = useState<Step>({ name: 'loading' });
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void getAccount().then((result) => {
      if (!active) return;
      if (result.ok) {
        setStep({ name: 'in', email: result.data.email });
        onChange(result.data);
      } else {
        setStep({ name: 'out' });
        setLoginOpen(true);
        onChange(null);
      }
    });
    return () => {
      active = false;
    };
  }, [onChange]);

  const leave = async () => {
    await logOut();
    setStep({ name: 'out' });
    onChange(null);
  };

  return (
    <section aria-label="Tu cuenta" className="space-y-3">
      {step.name === 'loading' && <p className="text-sm text-washi-muted">Cargando…</p>}

      {step.name === 'in' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline px-4 py-2 text-sm">
          <p>
            Pedís como <strong>{step.email}</strong>
          </p>
          <Button variant="ghost" onClick={leave}>
            Salir
          </Button>
        </div>
      )}

      {step.name === 'out' && (
        <div className="space-y-3 rounded-xl border border-hairline p-4 text-sm">
          <p className="text-washi-muted">Para mandar el pedido, verificá tu correo. Se hace una sola vez en este teléfono.</p>
          <Button variant="secondary" fullWidth onClick={() => setLoginOpen(true)}>
            Verificar mi correo
          </Button>
        </div>
      )}

      <LoginSheet
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoggedIn={(email) => {
          setLoginOpen(false);
          setStep({ name: 'in', email });
          // Asked again for the details: a customer on a new phone gets their last order's ones too
          void getAccount().then((result) =>
            onChange(result.ok ? result.data : { email, name: '', phone: '', address: '' }),
          );
        }}
      />
    </section>
  );
}
