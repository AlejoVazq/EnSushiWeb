'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  type SVGProps,
} from 'react';

import { ScheduleNotices } from '@/components/shop/ScheduleNotices';
import { AccountSection } from './AccountSection';
import { Button, buttonClassName } from '@/components/ui/Button';
import { CashIcon, CheckIcon, HomeIcon, PhoneIcon, StoreIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/Input';
import { BUSINESS, DELIVERY_METHOD_LABELS, PAYMENT_METHOD_LABELS } from '@/config/business';
import { useCartHydrated } from '@/hooks/useCartHydration';
import { useCartTotals } from '@/hooks/useCartTotals';
import { useCheckoutSchedule, useNow } from '@/hooks/useScheduleStatus';
import { useSettled } from '@/hooks/useSettled';
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
import { lookUpCode } from '@/lib/discounts';
import { formatPrice } from '@/lib/format';
import { getNow } from '@/lib/schedule';
import { normalizePhone } from '@/lib/phone';
import { checkDiscountCode, loadSavedPhone, ORDERS_BY_APP, savePhone, sendOrder } from '@/lib/pedidosApp';
import { buildWhatsAppUrl } from '@/services/whatsappService';
import { useCartStore } from '@/store/useCartStore';
import type { DeliveryMethod, DiscountCode, OrderDiscount, PaymentMethod } from '@/types';

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
              <span className="text-[0.9375rem] leading-tight font-bold text-washi">{option.label}</span>
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

/** "10% en tu pedido", "$ 2.000 menos en tu pedido" */
const describeCode = (definition: DiscountCode): string =>
  definition.kind === 'percent' ? `${definition.value}% en tu pedido` : `${formatPrice(definition.value)} menos en tu pedido`;

interface DiscountCodeFieldProps {
  /** The applied code, normalized; '' when none */
  applied: string;
  /** `definition`: when the server vouched for it (orders by app), so the page can compute it */
  onApply: (code: string, definition?: DiscountCode) => void;
  /** Codes the server vouched for (orders by app) */
  extraCodes: readonly DiscountCode[];
  onRemove: () => void;
  /** The discount the order ends up with (the code's, or the special day's if it saves more) */
  discount: OrderDiscount | null;
}

/** Folded by default: "¿Tenés un código de descuento?" opens the field; once applied it shows with "Quitar" */
function DiscountCodeField({ applied, onApply, onRemove, extraCodes, discount }: DiscountCodeFieldProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = 'discount-code-error';

  const fail = (message: string) => {
    setError(message);
    inputRef.current?.focus();
  };

  const succeed = (code: string, definition?: DiscountCode) => {
    setError(null);
    setValue('');
    setOpen(false);
    onApply(code, definition);
  };

  const apply = async () => {
    if (!ORDERS_BY_APP) {
      const lookup = lookUpCode(value, getNow());
      if (lookup.ok) succeed(lookup.code);
      else fail(lookup.error);
      return;
    }
    // Orders by app: the server also knows the codes made in the shop's app, and their use limits
    if (checking) return;
    if (!value.trim()) return fail('Ingresá el código.');
    setChecking(true);
    const result = await checkDiscountCode(value);
    setChecking(false);
    if (result.ok) succeed(result.data.code, result.data.definition);
    else fail(result.error);
  };

  if (applied) {
    const lookup = lookUpCode(applied, getNow(), extraCodes);
    // Applied, but the special day saves more: they don't stack, so the order keeps the day's
    const outdone = discount !== null && discount.label !== applied;
    return (
      <div className="rounded-xl border border-washi bg-sumi-2 px-4 py-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 wrap-anywhere">
            <span className="font-bold text-washi">{applied}</span>
            {lookup.ok && <span className="text-washi-muted"> · {describeCode(lookup.definition)}</span>}
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="-mr-2 h-11 shrink-0 rounded-[10px] px-2 font-bold text-washi underline underline-offset-4 transition-colors hover:bg-sumi-1 focus-visible:outline-2 focus-visible:outline-washi"
          >
            Quitar
          </button>
        </div>
        {outdone && (
          <p className="pb-1 text-pretty text-washi-muted">
            Hoy el {discount.label} te ahorra más. No se suman: te aplicamos ese.
          </p>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="-ml-2 inline-flex h-11 items-center rounded-[10px] px-2 text-sm font-bold text-washi underline underline-offset-4 transition-colors hover:bg-sumi-2 focus-visible:outline-2 focus-visible:outline-washi"
      >
        ¿Tenés un código de descuento?
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="discount-code" className="text-sm font-bold text-washi">
        Código de descuento
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id="discount-code"
          // No "name": the form's own fields are looked up by name to focus the first invalid one
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="done"
          maxLength={40}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            // Enter applies the code instead of submitting the order
            if (e.key === 'Enter') {
              e.preventDefault();
              void apply();
            }
          }}
          className={cn(
            'h-12 min-w-0 flex-1 rounded-xl border bg-sumi-1 px-4 text-base text-washi uppercase caret-washi transition-colors',
            'focus:border-washi focus:outline-2 focus:outline-offset-2 focus:outline-washi',
            error ? 'border-error' : 'border-field-edge',
          )}
        />
        <button
          type="button"
          onClick={() => void apply()}
          disabled={checking}
          className="h-12 shrink-0 rounded-xl border border-hairline-strong px-4 text-sm font-bold text-washi transition-colors hover:border-washi hover:bg-sumi-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-washi disabled:opacity-60"
        >
          {checking ? 'Revisando…' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
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
  // This screen replaces the form under the finger: a double tap on the send button must not reach "Hacer otro pedido"
  const settled = useSettled('sent');

  return (
    <div className="mx-auto mt-10 max-w-md space-y-6 text-center">
      <h1 className="font-title text-2xl text-balance sm:text-4xl">Terminá de enviarlo en WhatsApp</h1>
      <p className="text-washi-muted">
        Tu pedido ya está escrito en WhatsApp: solo tenés que tocar <strong className="text-washi">Enviar</strong>. Si no se
        abrió, tocá Abrir WhatsApp.
      </p>
      {isTransfer && <TransferNotice />}
      <div className={cn('space-y-3', !settled && 'pointer-events-none')}>
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
  const clearCart = useCartStore((state) => state.clearCart);

  const formRef = useRef<HTMLFormElement>(null);
  // Only read on the client: until the cart hydrates the page renders a skeleton, so the server's empty form never shows
  const [form, setForm] = useState<CheckoutForm>(() => loadCheckoutDraft(ORDERS_BY_APP));
  // Orders by app: codes the server vouched for (made in the shop's app), so the page can compute them
  const [serverCodes, setServerCodes] = useState<readonly DiscountCode[]>([]);
  const schedule = useCheckoutSchedule();
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [sent, setSent] = useState(false);
  const deliveryFee = deliveryFeeFor(form.deliveryMethod);
  const { subtotal, discount, total: itemsTotal } = useCartTotals(form.discountCode, serverCodes);
  const total = itemsTotal + deliveryFee;
  const now = useNow();

  useEffect(() => saveCheckoutDraft(form), [form]);

  // Orders by app: a code kept in the draft is asked about again (it may have been paused or used up meanwhile)
  const draftCode = useRef(form.discountCode);
  useEffect(() => {
    const code = draftCode.current;
    if (!ORDERS_BY_APP || !code) return;
    let cancelled = false;
    void checkDiscountCode(code).then((result) => {
      if (cancelled) return;
      if (result.ok) setServerCodes([result.data.definition]);
      // No connection: keep it, the server checks it again with the order
      else if (result.status !== 0) setForm((prev) => (prev.discountCode === code ? { ...prev, discountCode: '' } : prev));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A complete form turns the main button into a plain link to wa.me: in-app browsers (Instagram, Facebook) block window.open
  const isComplete = !CHECKOUT_FIELDS.some((field) => validateCheckout(form)[field]);
  const order = isComplete ? createOrder(form, items, now ?? getNow(), serverCodes) : null;
  const whatsappUrl = order ? buildWhatsAppUrl(order) : null;
  const submitLabel = ORDERS_BY_APP ? `Enviar pedido · ${formatPrice(total)}` : `Enviar pedido por WhatsApp · ${formatPrice(total)}`;

  // Orders by app (ORDERS_BY_APP): an account, a phone for the shop's WhatsApp answer, and a POST instead of wa.me
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const onAccountChange = useCallback((email: string | null) => setAccountEmail(email), []);
  const [phone, setPhone] = useState(loadSavedPhone);
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const update = <K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /** WhatsApp: only reached while the form is incomplete (a complete one shows the wa.me link). By app: sends it. */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateCheckout(form);
    setErrors(nextErrors);
    const badPhone = ORDERS_BY_APP && !normalizePhone(phone);
    setPhoneError(badPhone ? 'Ingresá tu celular con código de área, sin 0 ni 15.' : undefined);
    const firstInvalid = CHECKOUT_FIELDS.find((field) => nextErrors[field]) ?? (badPhone ? 'phone' : undefined);
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    if (!ORDERS_BY_APP || sending) return;
    if (!accountEmail) {
      setSendError('Primero ingresá con tu correo (arriba, en Tu cuenta).');
      return;
    }

    setSending(true);
    setSendError(null);
    const result = await sendOrder(form, phone, items);
    if (!result.ok) {
      setSending(false);
      setSendError(result.error);
      return;
    }
    savePhone(phone);
    clearCheckoutDraft();
    clearCart();
    router.push(`/pedido/${result.data.id}`);
  };

  // Set on the first tap, so a double tap opens the chat once
  const openedRef = useRef(false);

  // Deferred: a link removed from the page during its own click doesn't navigate
  const handleOpenWhatsApp = (event: MouseEvent<HTMLAnchorElement>) => {
    if (openedRef.current) {
      event.preventDefault();
      return;
    }
    openedRef.current = true;
    window.setTimeout(() => {
      setSent(true);
      // The form was long and this screen is short: start from its title
      window.scrollTo({ top: 0 });
    });
  };

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
          onEdit={() => {
            openedRef.current = false;
            setSent(false);
          }}
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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="w-full space-y-9 lg:max-w-2xl">
          {ORDERS_BY_APP && <AccountSection onChange={onAccountChange} />}

          <fieldset className="space-y-4">
            <legend className="mb-3 font-title text-xl text-washi sm:text-2xl">Tus datos</legend>
            <Input
              label="Nombre"
              name="name"
              autoComplete="name"
              maxLength={60}
              placeholder="¿A nombre de quién?"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              error={errors.name}
            />
            {ORDERS_BY_APP && (
              <Input
                label="Celular"
                name="phone"
                type="tel"
                autoComplete="tel-national"
                inputMode="tel"
                maxLength={20}
                placeholder="2478 567168"
                hint="Con código de área, sin 0 ni 15. Te confirmamos por WhatsApp a este número."
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError(undefined);
                }}
                error={phoneError}
              />
            )}
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
                maxLength={160}
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
            <DiscountCodeField
              applied={form.discountCode}
              onApply={(code, definition) => {
                if (definition) setServerCodes([definition]);
                update('discountCode', code);
              }}
              onRemove={() => update('discountCode', '')}
              extraCodes={serverCodes}
              discount={discount}
            />
            {/* On the phone the summary sits below the button: the total (and the delivery fee) shows right above it */}
            <dl className="space-y-1 rounded-xl border border-hairline p-4 text-sm lg:hidden">
              {(deliveryFee > 0 || discount) && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-washi-muted">Subtotal</dt>
                    <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                  </div>
                  {discount && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-washi-muted">Descuento ({discount.label})</dt>
                      <dd className="font-bold text-kin tabular-nums">−{formatPrice(discount.amount)}</dd>
                    </div>
                  )}
                  {deliveryFee > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-washi-muted">Envío</dt>
                      <dd className="tabular-nums">{formatPrice(deliveryFee)}</dd>
                    </div>
                  )}
                </>
              )}
              <div
                className={cn(
                  'flex items-baseline justify-between',
                  (deliveryFee > 0 || discount) && 'mt-1 border-t border-hairline pt-2',
                )}
              >
                <dt className="font-bold">Total</dt>
                <dd className="text-lg font-bold tabular-nums">{formatPrice(total)}</dd>
              </div>
              {form.deliveryMethod === null && (
                <p className="text-washi-muted">
                  Si elegís envío a domicilio, se suman {formatPrice(BUSINESS.delivery.fee)}.
                </p>
              )}
            </dl>
            <ScheduleNotices notices={schedule.notices} />
            {sendError && (
              <p role="alert" className="text-sm font-medium text-error">
                {sendError}
              </p>
            )}
            {ORDERS_BY_APP ? (
              <Button type="submit" size="lg" fullWidth disabled={!schedule.canCheckout || sending}>
                {sending ? 'Enviando…' : submitLabel}
              </Button>
            ) : whatsappUrl && schedule.canCheckout ? (
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
              {ORDERS_BY_APP
                ? 'El pedido le llega al local, que te confirma el horario por WhatsApp.'
                : 'Se abre WhatsApp con tu pedido listo para enviar. Te confirmamos por WhatsApp.'}
            </p>
          </div>
        </form>

        <div className="lg:sticky lg:top-6">
          <OrderSummary items={items} discount={discount} deliveryFee={deliveryFee} />
        </div>
      </div>
    </PageShell>
  );
}
