'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { CheckIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
import { requestCode, verifyCode } from '@/lib/pedidosApp';

/** The server lets a new code go out after this long (RESEND_SECONDS in src/server/auth.ts) */
const RESEND_SECONDS = 60;
const CODE_LENGTH = 6;

const noSubscribe = () => () => {};

type Step = { name: 'email' } | { name: 'code'; email: string; sentAt: number; alreadySent: boolean };

interface LoginSheetProps {
  open: boolean;
  onClose: () => void;
  /** The phone is logged in now (the session cookie is set) */
  onLoggedIn: (email: string) => void;
}

/**
 * Orders by app need a verified email, asked once per phone: why we ask, the email, then the 6-digit code.
 * Opens from the cart's "Continuar con el pedido" when there's no session (and from the checkout as a fallback).
 */
export function LoginSheet({ open, onClose, onLoggedIn }: LoginSheetProps) {
  const [step, setStep] = useState<Step>({ name: 'email' });
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Only read on the code step; set when a code goes out (Date.now() at render would break the prerender)
  const [now, setNow] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  // Rendered into <body>: the checkout's own <form> must not contain this one (Enter would send the order)
  const isClient = useSyncExternalStore(noSubscribe, () => true, () => false);

  // The resend countdown
  useEffect(() => {
    if (step.name !== 'code') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [step.name]);

  // On the code step, and back on it after a wrong code (the input is disabled while checking)
  useEffect(() => {
    if (step.name === 'code' && !busy) codeRef.current?.focus();
  }, [step.name, busy]);

  const sendCode = async (to: string) => {
    setBusy(true);
    setError(null);
    const result = await requestCode(to);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCode('');
    setNow(Date.now());
    setStep({ name: 'code', email: to.trim().toLowerCase(), sentAt: Date.now(), alreadySent: result.data.alreadySent });
  };

  const checkCode = async (forEmail: string, typed: string) => {
    setBusy(true);
    setError(null);
    const result = await verifyCode(forEmail, typed);
    setBusy(false);
    if (result.ok) {
      onLoggedIn(result.data.email);
      setStep({ name: 'email' });
      setCode('');
    } else {
      setError(result.error);
      setCode('');
    }
  };

  const onEmailSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!busy && email.includes('@')) void sendCode(email);
  };

  const onCodeChange = (value: string) => {
    if (step.name !== 'code') return;
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    // The last digit confirms on its own
    if (digits.length === CODE_LENGTH && !busy) void checkCode(step.email, digits);
  };

  const waitLeft = step.name === 'code' ? Math.max(0, RESEND_SECONDS - Math.floor((now - step.sentAt) / 1000)) : 0;

  if (!isClient) return null;

  return createPortal(
    <Sheet
      open={open}
      onClose={onClose}
      side="bottom"
      title={step.name === 'email' ? 'Antes de tu primer pedido' : 'Revisá tu correo'}
    >
      <div className="pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {step.name === 'email' ? (
          <form onSubmit={onEmailSubmit} noValidate>
            <p className="text-pretty text-washi-muted">
              Te mandamos un código a tu correo para confirmar que sos vos. Así evitamos pedidos falsos y la cocina solo
              prepara pedidos reales.
            </p>
            <ul className="mt-4 mb-5 space-y-2.5 text-sm">
              <li className="flex items-start gap-2.5">
                <CheckIcon className="mt-0.5 size-4.5 shrink-0" aria-hidden />
                <span>
                  Lo hacés <strong>una sola vez</strong>: este teléfono queda recordado.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckIcon className="mt-0.5 size-4.5 shrink-0" aria-hidden />
                <span>No te mandamos publicidad.</span>
              </li>
            </ul>
            <Input
              label="Tu correo"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error ?? undefined}
            />
            <Button type="submit" size="lg" fullWidth className="mt-4" disabled={busy || !email.includes('@')}>
              {busy ? 'Enviando…' : 'Mandarme el código'}
            </Button>
          </form>
        ) : (
          <div>
            <p className="text-washi-muted">
              {step.alreadySent ? 'Hace un momento te mandamos' : 'Te mandamos'} un código de 6 números a{' '}
              <strong className="text-washi">{step.email}</strong>.{step.alreadySent && ' Usá ese, sigue sirviendo.'}
            </p>

            <label htmlFor="login-code" className="mt-5 mb-1.5 block text-sm font-bold">
              Código
            </label>
            {/* One real input (paste and the phone's code suggestion work) over six boxes that show it */}
            <div className="relative">
              <input
                ref={codeRef}
                id="login-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                value={code}
                disabled={busy}
                onChange={(e) => onCodeChange(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby="login-code-message"
                className="peer absolute inset-0 z-10 w-full cursor-text opacity-0"
              />
              <div className="grid grid-cols-6 gap-2" aria-hidden>
                {Array.from({ length: CODE_LENGTH }, (_, index) => (
                  <span
                    key={index}
                    className={cn(
                      'grid h-14 place-items-center rounded-xl border bg-sumi-1 font-title text-2xl tabular-nums',
                      error ? 'border-error' : 'border-field-edge',
                      // The box the next digit goes into, while typing
                      index === Math.min(code.length, CODE_LENGTH - 1) &&
                        'peer-focus:border-washi peer-focus:outline-2 peer-focus:outline-washi',
                    )}
                  >
                    {code[index] ?? ''}
                  </span>
                ))}
              </div>
            </div>
            <p
              id="login-code-message"
              aria-live="polite"
              className={cn('mt-2 text-sm', error ? 'font-medium text-error' : 'text-washi-muted')}
            >
              {error ?? (busy ? 'Verificando…' : 'Si no llega en un minuto, mirá en spam o promociones.')}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setStep({ name: 'email' });
                  setError(null);
                }}
              >
                Usar otro correo
              </Button>
              <Button variant="secondary" disabled={busy || waitLeft > 0} onClick={() => void sendCode(step.email)}>
                {waitLeft > 0 ? `Reenviar en 0:${String(waitLeft).padStart(2, '0')}` : 'Reenviar código'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>,
    document.body,
  );
}
