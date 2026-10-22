'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ComponentType, type FormEvent, type ReactNode, type SVGProps } from 'react';

import { ScheduleNotices } from '@/components/shop/ScheduleNotices';
import { Button, buttonClassName } from '@/components/ui/Button';
import { CashIcon, CheckIcon, HomeIcon, PhoneIcon, StoreIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { BUSINESS, DELIVERY_METHOD_LABELS, PAYMENT_METHOD_LABELS } from '@/config/business';
import { useCartHydrated } from '@/hooks/useCartHydration';
import { useCheckoutSchedule } from '@/hooks/useScheduleStatus';
import {
  CHECKOUT_FIELDS,
  clearCheckoutDraft,
  createOrder,
  deliveryFeeFor,
  loadCheckoutDraft,
  saveCheckoutDraft,
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
  { value: 'pickup', label: DELIVERY_METHOD_LABELS.pickup, description: 'Lo pasás a buscar por el local.', icon: StoreIcon },
  {
    value: 'delivery',
    label: DELIVERY_METHOD_LABELS.delivery,
    description: `Te lo llevamos a tu dirección. Envío: ${formatPrice(BUSINESS.delivery.fee)}.`,
    icon: HomeIcon,
  },
];

const PAYMENT_OPTIONS: readonly ChoiceOption<PaymentMethod>[] = [
  { value: 'cash', label: PAYMENT_METHOD_LABELS.cash, description: 'Pagás al recibir o retirar el pedido.', icon: CashIcon },
  {
    value: 'transfer',
    label: PAYMENT_METHOD_LABELS.transfer,
    description: `Por ${BUSINESS.transfer.provider}.`,
    icon: PhoneIcon,
  },
];

interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
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

/** A question with two big, equal options side by side (also on the phone) */
function ChoiceCards<T extends string>({ name, legend, options, value, onChange, error, children }: ChoiceCardsProps<T>) {
  const errorId = `${name}-error`;

  return (
    <fieldset aria-describedby={error ? errorId : undefined} className="space-y-4">
      <legend className="mb-3 font-title text-xl text-washi sm:text-2xl">{legend}</legend>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const selected = value === option.value;
          const Icon = option.icon;
          return (
            <label
              key={option.value}
              className={cn(
                'relative flex min-h-32 cursor-pointer flex-col gap-2 rounded-xl border p-4 transition-colors',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-washi',
                selected
                  ? 'border-washi bg-sumi-2'
                  : error
                    ? 'border-error'
                    : 'border-hairline-strong hover:border-washi-muted',
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
              <Icon width={24} height={24} className={selected ? 'text-washi' : 'text-washi-muted'} />
              {/* Selection isn't color alone: the check marks it too */}
              {selected && <CheckIcon width={18} height={18} className="absolute top-3.5 right-3.5 text-washi" />}
              <span className="text-[15px] leading-tight font-bold text-washi">{option.label}</span>
              <span className="text-sm leading-snug text-pretty text-washi-muted">{option.description}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="text-sm font-medium text-error">
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
    <p role="note" className="rounded-xl border border-hairline-strong p-4 text-left text-sm leading-relaxed text-washi">
      No transfieras todavía: cuando confirmemos tu pedido por WhatsApp te pasamos el alias y el total. Después
      mandás el comprobante por el mismo chat.
    </p>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="-ml-2 inline-flex h-11 items-center rounded-[10px] px-2 text-sm font-bold text-washi-muted transition-colors hover:bg-sumi-2 hover:text-washi focus-visible:outline-2 focus-visible:outline-washi"
      >
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
      <h1 className="font-title text-2xl text-balance sm:text-4xl">Terminá de enviarlo en WhatsApp</h1>
      <p className="text-washi-muted">
        Tu pedido ya está escrito en WhatsApp: solo tenés que tocar <strong className="text-washi">Enviar</strong>. Si no se
        abrió, tocá Abrir WhatsApp.
      </p>
      {isTransfer && <TransferNotice />}
      <div className="space-y-3">
        <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClassName({ size: 'lg', fullWidth: true })}>
          Abrir WhatsApp
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
  const subtotal = useCartStore(selectCartTotal);
  const clearCart = useCartStore((state) => state.clearCart);

  const formRef = useRef<HTMLFormElement>(null);
  // Only read on the client: until the cart hydrates the page renders a skeleton, so the server's empty form never shows
  const [form, setForm] = useState<CheckoutForm>(loadCheckoutDraft);
  const schedule = useCheckoutSchedule();
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [sent, setSent] = useState(false);
  const deliveryFee = deliveryFeeFor(form.deliveryMethod);

  useEffect(() => saveCheckoutDraft(form), [form]);

  // A complete form turns the main button into a plain link to wa.me: in-app browsers (Instagram, Facebook) block window.open
  const isComplete = !CHECKOUT_FIELDS.some((field) => validateCheckout(form)[field]);
  const order = isComplete ? createOrder(form, items) : null;
  const whatsappUrl = order ? buildWhatsAppUrl(order) : null;
  const submitLabel = `Enviar pedido por WhatsApp · ${formatPrice(subtotal + deliveryFee)}`;

  const update = <K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /** Only reached while the form is incomplete (a complete one shows the WhatsApp link instead) */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateCheckout(form);
    setErrors(nextErrors);
    const firstInvalid = CHECKOUT_FIELDS.find((field) => nextErrors[field]);
    if (firstInvalid) formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
  };

  // Deferred: a link removed from the page during its own click doesn't navigate
  const handleOpenWhatsApp = () => window.setTimeout(() => setSent(true));

  if (!hydrated) {
    return (
      <PageShell>
        <div className="mt-8 h-96 animate-pulse rounded-2xl bg-sumi-1" aria-hidden="true" />
      </PageShell>
    );
  }

  if (sent && whatsappUrl) {
    return (
      <PageShell>
        <SentScreen
          url={whatsappUrl}
          isTransfer={form.paymentMethod === 'transfer'}
          onEdit={() => setSent(false)}
          onNewOrder={() => {
            clearCheckoutDraft();
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
          <h1 className="font-title text-2xl sm:text-3xl">Tu pedido está vacío</h1>
          <p className="text-washi-muted">Sumá algo del menú para poder finalizar el pedido.</p>
          <Link href="/" className={buttonClassName({ variant: 'secondary', className: 'mt-2' })}>
            Ver el menú
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="mt-4 mb-6 font-title text-2xl sm:mb-8 sm:text-4xl">Finalizar pedido</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-9">
          <fieldset>
            <legend className="mb-3 font-title text-xl text-washi sm:text-2xl">Tus datos</legend>
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
            legend="¿Cómo lo recibís?"
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
              <div className="rounded-xl border border-hairline p-4 text-sm">
                <p className="text-washi-muted">Retirás en</p>
                <p className="mt-0.5 font-bold text-washi">{BUSINESS.pickup.address}</p>
              </div>
            )}
          </ChoiceCards>

          <ChoiceCards
            name="paymentMethod"
            legend="¿Cómo pagás?"
            options={PAYMENT_OPTIONS}
            value={form.paymentMethod}
            onChange={(method) => update('paymentMethod', method)}
            error={errors.paymentMethod}
          >
            {form.paymentMethod === 'transfer' && <TransferNotice />}
          </ChoiceCards>

          <p className="text-sm text-washi-muted">Para hoy · el horario lo coordinamos por WhatsApp</p>

          <div className="space-y-3">
            {/* On the phone the summary sits below the button: the total (and the delivery fee) shows right above it */}
            <dl className="space-y-1 rounded-xl border border-hairline p-4 text-sm lg:hidden">
              {deliveryFee > 0 && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-washi-muted">Subtotal</dt>
                    <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-washi-muted">Envío</dt>
                    <dd className="tabular-nums">{formatPrice(deliveryFee)}</dd>
                  </div>
                </>
              )}
              <div
                className={cn(
                  'flex items-baseline justify-between',
                  deliveryFee > 0 && 'mt-1 border-t border-hairline pt-2',
                )}
              >
                <dt className="font-bold">Total</dt>
                <dd className="text-lg font-bold tabular-nums">{formatPrice(subtotal + deliveryFee)}</dd>
              </div>
              {form.deliveryMethod === null && (
                <p className="text-washi-muted">
                  Si elegís envío a domicilio, se suman {formatPrice(BUSINESS.delivery.fee)}.
                </p>
              )}
            </dl>
            <ScheduleNotices notices={schedule.notices} />
            {whatsappUrl && schedule.canCheckout ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOpenWhatsApp}
                className={buttonClassName({ size: 'lg', fullWidth: true })}
              >
                {submitLabel}
              </a>
            ) : (
              <Button type="submit" size="lg" fullWidth disabled={!schedule.canCheckout}>
                {submitLabel}
              </Button>
            )}
            <p className="text-center text-sm text-balance text-washi-muted">
              Se abre WhatsApp con tu pedido listo para enviar. Te confirmamos por WhatsApp.
            </p>
          </div>
        </form>

        <div className="lg:sticky lg:top-6">
          <OrderSummary items={items} deliveryFee={deliveryFee} />
        </div>
      </div>
    </PageShell>
  );
}
