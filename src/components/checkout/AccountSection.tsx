'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getAccount, logOut, requestCode, verifyCode } from '@/lib/pedidosApp';

type Step = { name: 'loading' } | { name: 'email' } | { name: 'code'; email: string } | { name: 'in'; email: string };

interface AccountSectionProps {
  /** The logged-in email, or null while there's none */
  onChange: (email: string | null) => void;
}

/**
 * Orders by app need an account: the customer types their email, gets a 6-digit code and types it here.
 * The phone stays logged in (60 days), so next time this is just "Pedís como …".
 */
export function AccountSection({ onChange }: AccountSectionProps) {
  const [step, setStep] = useState<Step>({ name: 'loading' });
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void getAccount().then((result) => {
      if (!active) return;
      if (result.ok) {
        setStep({ name: 'in', email: result.data.email });
        onChange(result.data.email);
      } else {
        setStep({ name: 'email' });
        onChange(null);
      }
    });
    return () => {
      active = false;
    };
  }, [onChange]);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const result = await requestCode(email);
    setBusy(false);
    if (result.ok) {
      setStep({ name: 'code', email: email.trim().toLowerCase() });
      setCode('');
    } else {
      setError(result.error);
    }
  };

  const checkCode = async (forEmail: string) => {
    setBusy(true);
    setError(null);
    const result = await verifyCode(forEmail, code);
    setBusy(false);
    if (result.ok) {
      setStep({ name: 'in', email: result.data.email });
      onChange(result.data.email);
    } else {
      setError(result.error);
    }
  };

  const leave = async () => {
    await logOut();
    setStep({ name: 'email' });
    setEmail('');
    onChange(null);
  };

  // Enter inside the checkout form would submit the order: here it runs this step instead
  const onEnter = (action: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (!busy) action();
  };

  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 font-title text-xl text-washi sm:text-2xl">Tu cuenta</legend>

      {step.name === 'loading' && <p className="text-sm text-washi-muted">Cargando…</p>}

      {step.name === 'in' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline p-4 text-sm">
          <p>
            Pedís como <strong>{step.email}</strong>
          </p>
          <Button variant="ghost" onClick={leave}>
            Salir
          </Button>
        </div>
      )}

      {step.name === 'email' && (
        <>
          <Input
            label="Correo"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="tu@correo.com"
            hint="Te mandamos un código para confirmar que es tuyo. Se pide una sola vez en este celular."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={onEnter(sendCode)}
            error={error ?? undefined}
          />
          <Button variant="secondary" fullWidth disabled={busy || !email.includes('@')} onClick={sendCode}>
            {busy ? 'Enviando…' : 'Enviarme el código'}
          </Button>
        </>
      )}

      {step.name === 'code' && (
        <>
          <Input
            label="Código"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6 números"
            hint={`Lo mandamos a ${step.email}. Si no llega, mirá en spam.`}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={onEnter(() => void checkCode(step.email))}
            error={error ?? undefined}
          />
          <Button variant="secondary" fullWidth disabled={busy || code.length !== 6} onClick={() => checkCode(step.email)}>
            {busy ? 'Verificando…' : 'Confirmar código'}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setStep({ name: 'email' });
              setError(null);
            }}
          >
            Usar otro correo
          </Button>
        </>
      )}
    </fieldset>
  );
}
