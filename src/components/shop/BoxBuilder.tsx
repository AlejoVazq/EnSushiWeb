'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { MinusIcon, PlusIcon } from '@/components/ui/icons';
import { BUSINESS } from '@/config/business';
import { BUILD_BOX_SIZES, BUILD_ITEM_GROUPS, getBuildItemById, getBuildItemsByGroup, isBoxItem } from '@/data/menu';
import { useScheduleStatus } from '@/hooks/useScheduleStatus';
import { formatUnits, stepUnits } from '@/lib/cartLine';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { getExtraLineId, useCartStore, type BoxInput } from '@/store/useCartStore';
import type { BuildItem, BuildItemGroup } from '@/types';

import { addButtonClassName, HollowSeal, LineAction, stepButtonClassName } from './LineAction';

const { preorderCutoff } = BUSINESS.schedule;

/** The box being built, kept by the shop so it survives switching tabs and "Editar" can load one from the cart */
export interface BoxDraft {
  /** Chosen box size; null until the customer picks one */
  pieces: number | null;
  /** Steps per box item id */
  steps: Readonly<Record<string, number>>;
  /** Cart line being edited, if the box came from "Editar" */
  editingLineId: string | null;
  /** Short confirmation after adding or saving, shown in the bar */
  notice: 'added' | 'saved' | null;
}

export const EMPTY_BOX_DRAFT: BoxDraft = { pieces: null, steps: {}, editingLineId: null, notice: null };

/** Pieces already in the box */
const filledPieces = (steps: BoxDraft['steps']): number =>
  Object.entries(steps).reduce((sum, [id, count]) => {
    const item = getBuildItemById(id);
    return item ? sum + stepUnits(item, count) : sum;
  }, 0);

/** True while the bar has something to show: a size, pieces, an edit or a confirmation */
export const isBoxDraftActive = (draft: BoxDraft): boolean =>
  draft.pieces !== null || filledPieces(draft.steps) > 0 || draft.editingLineId !== null || draft.notice !== null;

const boxTotal = (steps: BoxDraft['steps']): number =>
  Object.entries(steps).reduce((sum, [id, count]) => sum + (getBuildItemById(id)?.price ?? 0) * count, 0);

/** "De a 5 piezas", "Por unidad" */
const stepLabel = (item: BuildItem): string =>
  item.step === 1 ? 'Por unidad' : `De a ${formatUnits(item.step, item.unitLabel)}`;

const GROUP_NOTES: Record<BuildItemGroup, (items: readonly BuildItem[]) => string> = {
  rolls: (items) => (items[0] ? stepLabel(items[0]) : ''),
  nigiris: (items) => (items[0] ? stepLabel(items[0]) : ''),
  acompanamientos: () => 'Van aparte, no cuentan en la caja',
};

const CUTOFF_TITLE = `Se pueden pedir hasta las ${preorderCutoff}`;

interface BoxItemRowProps {
  item: BuildItem;
  steps: number;
  /** One more step fits in the chosen box */
  fits: boolean;
  /** Past the preorder cutoff */
  blocked: boolean;
  onChange: (steps: number) => void;
  /** "+" before choosing a size: sends the customer to the size picker */
  onNeedSize: () => void;
  needsSize: boolean;
}

function BoxItemRow({ item, steps, fits, blocked, onChange, onNeedSize, needsSize }: BoxItemRowProps) {
  const units = stepUnits(item, steps);
  const unavailable = !item.available || blocked;

  let control;
  if (!item.available) control = <HollowSeal>Agotado hoy</HollowSeal>;
  else if (blocked) control = <HollowSeal title={CUTOFF_TITLE}>Hasta las {preorderCutoff}</HollowSeal>;
  else if (steps === 0)
    control = (
      <button
        type="button"
        onClick={needsSize ? onNeedSize : () => onChange(1)}
        disabled={!needsSize && !fits}
        aria-label={`Sumar ${formatUnits(item.step, item.unitLabel)} de ${item.name} a la caja`}
        className={addButtonClassName}
      >
        <PlusIcon />
      </button>
    );
  else
    control = (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(steps - 1)}
          aria-label={`Sacar ${formatUnits(item.step, item.unitLabel)} de ${item.name}`}
          className={stepButtonClassName}
        >
          <MinusIcon />
        </button>
        {/* In the box, not in the order yet: a plain count, never the bermellón seal */}
        <span className="grid min-w-11 place-items-center font-title text-lg text-washi tabular-nums">
          {units}
          <span className="sr-only"> {item.unitLabel} de {item.name} en la caja</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(steps + 1)}
          disabled={!fits}
          aria-label={`Sumar ${formatUnits(item.step, item.unitLabel)} más de ${item.name}`}
          className={stepButtonClassName}
        >
          <PlusIcon />
        </button>
      </div>
    );

  return (
    <div className="flex min-h-19 items-center justify-between gap-4 py-3.5">
      <div className={cn('min-w-0', unavailable && 'opacity-60')}>
        <h4 className={cn('font-title text-lg leading-snug', unavailable ? 'text-washi-muted' : 'text-washi')}>
          {item.name}
        </h4>
        <p className="text-sm text-washi-muted tabular-nums">
          {formatUnits(item.step, item.unitLabel)} · {formatPrice(item.price)}
        </p>
      </div>
      {control}
    </div>
  );
}

function ExtraRow({ item }: { item: BuildItem }) {
  const addExtra = useCartStore((state) => state.addExtra);

  return (
    <div className="flex min-h-19 items-center justify-between gap-4 py-3.5">
      <div className={cn('min-w-0', !item.available && 'opacity-60')}>
        <h4 className={cn('font-title text-lg leading-snug', item.available ? 'text-washi' : 'text-washi-muted')}>
          {item.name}
        </h4>
        <p className="text-sm text-washi-muted tabular-nums">
          {formatUnits(item.step, item.unitLabel)} · {formatPrice(item.price)}
        </p>
      </div>
      {item.available ? (
        <LineAction
          lineId={getExtraLineId(item.id)}
          label={`${item.name} (${formatUnits(item.step, item.unitLabel)})`}
          onAdd={() => addExtra(item.id)}
        />
      ) : (
        <HollowSeal>Agotado hoy</HollowSeal>
      )}
    </div>
  );
}

interface BoxBuilderProps {
  draft: BoxDraft;
  onDraftChange: (draft: BoxDraft) => void;
  onOpenCart: () => void;
}

/** "Arma tu combo": pick a box size, fill it exactly with rolls and nigiris; acompañamientos go to the order on their own */
export function BoxBuilder({ draft, onDraftChange, onOpenCart }: BoxBuilderProps) {
  const addBox = useCartStore((state) => state.addBox);
  const replaceBox = useCartStore((state) => state.replaceBox);
  const blocked = useScheduleStatus()?.isPastPreorderCutoff ?? false;
  const sizeRef = useRef<HTMLFieldSetElement>(null);
  const [askSize, setAskSize] = useState(false);

  const { pieces, steps, editingLineId, notice } = draft;
  const filled = filledPieces(steps);
  const remaining = pieces === null ? null : pieces - filled;
  const total = boxTotal(steps);
  const complete = remaining === 0 && filled > 0;

  // The confirmation fades after a few seconds and the regular "Ver pedido" plate comes back
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => onDraftChange({ ...draft, notice: null }), 4000);
    return () => clearTimeout(id);
  }, [notice, draft, onDraftChange]);

  useEffect(() => {
    if (!askSize) return;
    const id = setTimeout(() => setAskSize(false), 2500);
    return () => clearTimeout(id);
  }, [askSize]);

  const update = (next: Partial<BoxDraft>) => onDraftChange({ ...draft, notice: null, ...next });

  const setSteps = (item: BuildItem, count: number) => {
    const next = { ...steps };
    if (count > 0) next[item.id] = count;
    else delete next[item.id];
    update({ steps: next });
  };

  const requestSize = () => {
    setAskSize(true);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    sizeRef.current?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    sizeRef.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus({ preventScroll: true });
  };

  const submit = () => {
    if (pieces === null || !complete) return;
    const input: BoxInput = { pieces, steps };
    const stillInCart = editingLineId && useCartStore.getState().items.some((item) => item.lineId === editingLineId);
    if (editingLineId && stillInCart) replaceBox(editingLineId, input);
    else addBox(input);
    onDraftChange({ ...EMPTY_BOX_DRAFT, notice: editingLineId ? 'saved' : 'added' });
  };

  const cancelEdit = () => onDraftChange(EMPTY_BOX_DRAFT);

  const tooSmall = BUILD_BOX_SIZES.some((size) => size < filled);
  const showBar = isBoxDraftActive(draft);

  return (
    <div className="space-y-8">
      {blocked && (
        <p className="rounded-xl border border-hairline-strong px-4 py-3 text-sm leading-relaxed text-washi">
          Los rolls y nigiris se piden hasta las {preorderCutoff}. Ahora podés sumar acompañamientos a tu pedido.
        </p>
      )}

      <fieldset
        ref={sizeRef}
        disabled={blocked}
        className={cn(
          'scroll-mt-32 rounded-xl transition-[outline-color] duration-300',
          askSize ? 'outline-2 outline-offset-8 outline-washi' : 'outline-transparent',
        )}
      >
        <legend className="mb-1 font-title text-xl text-washi">Tamaño de la caja</legend>
        <p className={cn('mb-3 text-sm', askSize ? 'font-bold text-washi' : 'text-washi-muted')}>
          {askSize ? 'Elegí el tamaño de la caja' : 'La llenás con rolls y nigiris hasta completarla.'}
        </p>
        <div className="grid grid-cols-5 gap-2 sm:max-w-lg">
          {BUILD_BOX_SIZES.map((size) => {
            const selected = size === pieces;
            const disabled = blocked || size < filled;
            return (
              <label
                key={size}
                className={cn(
                  'flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border leading-tight transition-colors',
                  'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-washi',
                  selected ? 'border-washi bg-sumi-2 text-washi' : 'border-hairline text-washi-muted',
                  !selected && !disabled && 'hover:border-hairline-strong hover:text-washi',
                  disabled && 'cursor-default opacity-40',
                )}
              >
                <input
                  type="radio"
                  name="box-size"
                  checked={selected}
                  disabled={disabled}
                  onChange={() => update({ pieces: size })}
                  className="sr-only"
                />
                <span className="font-title text-xl tabular-nums">{size}</span>
                <span className="text-xs">piezas</span>
              </label>
            );
          })}
        </div>
        {tooSmall && !blocked && (
          <p className="mt-2 text-sm text-washi-muted">Para una caja más chica, sacá piezas.</p>
        )}
      </fieldset>

      {BUILD_ITEM_GROUPS.map((group) => {
        const items = getBuildItemsByGroup(group.id);
        if (items.length === 0) return null;
        const inBox = items.every(isBoxItem);
        return (
          <section key={group.id} aria-labelledby={`group-${group.id}`}>
            <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-hairline pb-2">
              <h3 id={`group-${group.id}`} className="font-title text-xl text-washi">
                {group.name}
              </h3>
              <p className="text-sm text-washi-muted">
                {GROUP_NOTES[group.id](items)}
                {inBox && (
                  <span className={cn(blocked && 'font-bold text-washi')}> · hasta las {preorderCutoff}</span>
                )}
              </p>
            </header>
            <ul className="grid lg:grid-cols-2 lg:gap-x-12">
              {items.map((item) => (
                <li key={item.id} className="border-b border-hairline">
                  {inBox ? (
                    <BoxItemRow
                      item={item}
                      steps={steps[item.id] ?? 0}
                      fits={remaining !== null && item.step <= remaining}
                      blocked={blocked}
                      needsSize={pieces === null}
                      onNeedSize={requestSize}
                      onChange={(count) => setSteps(item, count)}
                    />
                  ) : (
                    <ExtraRow item={item} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p aria-live="polite" className="sr-only">
        {pieces !== null && !notice ? `${filled} de ${pieces} piezas` : ''}
        {notice === 'added' ? 'Agregaste tu caja al pedido' : notice === 'saved' ? 'Guardamos los cambios de tu caja' : ''}
      </p>

      {showBar && (
        <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 lg:ml-auto lg:max-w-xl">
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 rounded-2xl bg-washi py-3 pr-3 pl-4 text-sumi shadow-lg shadow-black/50">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tabular-nums">
                {notice === 'added'
                  ? 'Agregaste tu caja'
                  : notice === 'saved'
                    ? 'Guardamos los cambios'
                    : pieces === null
                      ? `${filled} piezas · elegí la caja`
                      : `${editingLineId ? 'Editando · ' : ''}Caja de ${pieces} · ${filled} de ${pieces}`}
              </p>
              <p className="text-sm font-medium tabular-nums">
                {notice ? 'Podés armar otra o seguir con tu pedido.' : `Total ${formatPrice(total)}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {editingLineId && !notice && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="h-11 rounded-xl px-3 text-sm font-bold underline underline-offset-4 hover:bg-sumi/10 focus-visible:outline-2 focus-visible:outline-sumi"
                >
                  Cancelar
                </button>
              )}
              {notice ? (
                <BarButton onClick={onOpenCart}>Ver pedido</BarButton>
              ) : blocked ? (
                <BarButton disabled>Hasta las {preorderCutoff}</BarButton>
              ) : pieces === null ? (
                <BarButton onClick={requestSize} outline>
                  Elegí la caja
                </BarButton>
              ) : complete ? (
                <BarButton onClick={submit}>
                  {editingLineId ? 'Guardar' : 'Agregar'} · {formatPrice(total)}
                </BarButton>
              ) : (
                <BarButton disabled>Faltan {formatUnits(remaining ?? 0, 'piezas')}</BarButton>
              )}
            </div>
            {pieces !== null && !notice && (
              <div className="col-span-2 mt-2.5 h-1.5 overflow-hidden rounded-full bg-sumi/15" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-sumi transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.min(100, (filled / pieces) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface BarButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Outlined: a step to take, not the final action */
  outline?: boolean;
}

/** The bar's action. Disabled still reads at full contrast: "Faltan 5 piezas" is information the customer needs. */
function BarButton({ children, onClick, disabled = false, outline = false }: BarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-11 rounded-xl px-4 text-sm font-bold whitespace-nowrap tabular-nums transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sumi',
        disabled || outline
          ? 'border-[1.5px] border-sumi/40 text-sumi'
          : 'bg-sumi text-washi hover:bg-sumi-2',
        disabled && 'cursor-default',
        outline && !disabled && 'hover:border-sumi',
      )}
    >
      {children}
    </button>
  );
}
