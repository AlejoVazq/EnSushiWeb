'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';

import { Button, buttonClassName } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BUSINESS, DELIVERY_METHOD_LABELS, PAYMENT_METHOD_LABELS } from '@/config/business';
import { useCartHydrated } from '@/hooks/useCartHydration';
import {
  CHECKOUT_FIELDS,
  createOrder,
  validateCheckout,
  type CheckoutErrors,
  type CheckoutForm,
} from '@/lib/checkout';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { buildWhatsAppUrl } from '@/services/whatsappService';
import { selectCartTotal, useCartStore } from '@/store/useCartStore';
import type { DeliveryMethod, PaymentMethod } from '@/types';

import { OrderSummary } from './OrderSummary';

const DELIVERY_OPTIONS: readonly ChoiceOption<DeliveryMethod>[] = [
  { value: 'pickup', label: DELIVERY_METHOD_LABELS.pickup, description: 'Lo pasás a buscar por el local.' },
  { value: 'delivery', label: DELIVERY_METHOD_LABELS.delivery, description: 'Te lo llevamos a tu dirección.' },
];

const PAYMENT_OPTIONS: readonly ChoiceOption<PaymentMethod>[] = [
  { value: 'cash', label: PAYMENT_METHOD_LABELS.cash, description: 'Pagás al recibir o retirar el pedido.' },
  {
    value: 'transfer',
    label: PAYMENT_METHOD_LABELS.transfer,
    description: `Por ${BUSINESS.transfer.provider}. Te pasamos el alias cuando confirmemos el pedido.`,
  },
];

interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

interface ChoiceCardsProps<T extends string> {
  name: string;
  legend: string;
  options: readonly ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
  children?: ReactNode;
}

/** Radio group rendered as selectable cards */
function ChoiceCards<T extends string>({ name, legend, options, value, onChange, error, children }: ChoiceCardsProps<T>) {
  const errorId = `${name}-error`;

  return (
    <fieldset aria-describedby={error ? errorId : undefined} className="space-y-4">
      <legend className="mb-4 font-display text-2xl font-medium">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                'cursor-pointer rounded-2xl border p-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent',
                selected ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="block font-medium">{option.label}</span>
              <span className="mt-1 block text-sm text-muted">{option.description}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
      {children}
    </fieldset>
  );
}

/** Account data is never shown on the site: it's sent by WhatsApp once the order is confirmed */
function TransferNotice() {
  return (
    <p role="note" className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-left text-sm leading-relaxed">
      Te habilitaremos la transferencia por WhatsApp una vez que hayamos confirmado tu pedido.
    </p>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="text-sm text-muted transition-colors hover:text-fg">
        ← Volver al menú
      </Link>
      {children}
    </main>
  );
}

function SentScreen({ url, isTransfer, onEdit, onNewOrder }: {
  url: string;
  isTransfer: boolean;
  onEdit: () => void;
  onNewOrder: () => void;
}) {
  return (
    <div className="mx-auto mt-10 max-w-md space-y-6 text-center">
      <h1 className="font-display text-4xl font-medium">Terminá de enviarlo en WhatsApp</h1>
      <p className="text-muted">
        Abrimos WhatsApp con tu pedido ya escrito. Solo tenés que tocar <strong className="text-fg">Enviar</strong>.
      </p>
      {isTransfer && <TransferNotice />}
      <div className="space-y-3">
        <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClassName({ size: 'lg', fullWidth: true })}>
          Abrir WhatsApp de nuevo
        </a>
        <Button variant="secondary" size="lg" fullWidth onClick={onNewOrder}>
          Ya lo envié · Hacer otro pedido
        </Button>
        <Button variant="ghost" fullWidth onClick={onEdit}>
          Volver y modificar
        </Button>
      </div>
    </div>
  );
}

export function Checkout() {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const items = useCartStore((state) => state.items);
  const total = useCartStore(selectCartTotal);
  const clearCart = useCartStore((state) => state.clearCart);

  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<CheckoutForm>({ name: '', deliveryMethod: null, address: '', paymentMethod: null });
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const update = <K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateCheckout(form);
    setErrors(nextErrors);

    const firstInvalid = CHECKOUT_FIELDS.find((field) => nextErrors[field]);
    const order = firstInvalid ? null : createOrder(form, items);
    if (!order) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    const url = buildWhatsAppUrl(order);
    setWhatsappUrl(url);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!hydrated) {
    return (
      <PageShell>
        <div className="mt-10 h-96 animate-pulse rounded-3xl border border-line bg-surface" aria-hidden="true" />
      </PageShell>
    );
  }

  if (whatsappUrl) {
    return (
      <PageShell>
        <SentScreen
          url={whatsappUrl}
          isTransfer={form.paymentMethod === 'transfer'}
          onEdit={() => setWhatsappUrl(null)}
          onNewOrder={() => {
            clearCart();
            router.push('/');
          }}
        />
      </PageShell>
    );
  }

  if (items.length === 0) {
    return (
      <PageShell>
        <div className="mx-auto mt-16 max-w-sm space-y-4 text-center">
          <h1 className="font-display text-4xl font-medium">Tu pedido está vacío</h1>
          <p className="text-muted">Sumá algo del menú para poder finalizar el pedido.</p>
          <Link href="/" className={buttonClassName({ variant: 'secondary', className: 'mt-2' })}>
            Ver el menú
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="mt-6 mb-8 font-display text-4xl font-medium sm:text-5xl">Finalizar pedido</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-10">
          <fieldset>
            <legend className="mb-4 font-display text-2xl font-medium">Tus datos</legend>
            <Input
              label="Nombre"
              name="name"
              autoComplete="name"
              placeholder="¿A nombre de quién?"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              error={errors.name}
            />
          </fieldset>

          <ChoiceCards
            name="deliveryMethod"
            legend="Entrega"
            options={DELIVERY_OPTIONS}
            value={form.deliveryMethod}
            onChange={(method) => update('deliveryMethod', method)}
            error={errors.deliveryMethod}
          >
            {form.deliveryMethod === 'delivery' && (
              <Input
                label="Dirección de entrega"
                name="address"
                autoComplete="street-address"
                placeholder="Calle y número"
                hint="Sumá piso, depto o alguna referencia si hace falta."
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                error={errors.address}
              />
            )}
            {form.deliveryMethod === 'pickup' && (
              <div className="rounded-2xl border border-line bg-surface-2 p-4 text-sm">
                <p className="text-subtle">Retirás en</p>
                <p className="mt-0.5 font-medium">{BUSINESS.pickup.address}</p>
              </div>
            )}
          </ChoiceCards>

          <ChoiceCards
            name="paymentMethod"
            legend="Método de pago"
            options={PAYMENT_OPTIONS}
            value={form.paymentMethod}
            onChange={(method) => update('paymentMethod', method)}
            error={errors.paymentMethod}
          >
            {form.paymentMethod === 'transfer' && <TransferNotice />}
          </ChoiceCards>

          <div className="space-y-3">
            <Button type="submit" size="lg" fullWidth>
              Enviar pedido por WhatsApp · {formatPrice(total)}
            </Button>
            <p className="text-center text-sm text-subtle">Se abre WhatsApp con tu pedido listo para enviar.</p>
          </div>
        </form>

        <div className="lg:sticky lg:top-8">
          <OrderSummary items={items} total={total} />
        </div>
      </div>
    </PageShell>
  );
}
