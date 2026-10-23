'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { MinusIcon, PlusIcon } from '@/components/ui/icons';
import { BUSINESS } from '@/config/business';
import { BUILD_BOX_SIZES, BUILD_ITEM_GROUPS, getBoxSize, getBuildItemById, getBuildItemsByGroup, isBoxItem } from '@/data/menu';
import { useCanOrder, useScheduleStatus } from '@/hooks/useScheduleStatus';
import { useSettled } from '@/hooks/useSettled';
import {
  canReachFill,
  describeCombinations,
  formatFill,
  formatMissing,
  getBoxFill,
  getMissing,
  isEmptyFill,
  isValidFill,
  type BoxFill,
} from '@/lib/boxRules';
import { formatUnits } from '@/lib/cartLine';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { useCartStore, type BoxInput } from '@/store/useCartStore';
import type { BuildBoxSizeId, BuildItem, BuildItemGroup } from '@/types';

import { addButtonClassName, HollowSeal, stepButtonClassName } from './LineAction';

const { preorderCutoff } = BUSINESS.schedule;

/** The box being built, kept by the shop so it survives switching tabs and "Editar" can load one from the cart */
export interface BoxDraft {
  /** Chosen box; null until the customer picks one */
  size: BuildBoxSizeId | null;
  /** Steps per box item id */
  steps: Readonly<Record<string, number>>;
  /** Cart line being edited, if the box came from "Editar" */
  editingLineId: string | null;
  /** Short confirmation after adding or saving, shown in the bar */
  notice: 'added' | 'saved' | null;
}

export const EMPTY_BOX_DRAFT: BoxDraft = { size: null, steps: {}, editingLineId: null, notice: null };

/** True while the bar has something to show: a size, pieces, an edit or a confirmation */
export const isBoxDraftActive = (draft: BoxDraft): boolean =>
  draft.size !== null || !isEmptyFill(getBoxFill(draft.steps)) || draft.editingLineId !== null || draft.notice !== null;

/** Why the box can't change right now: the shop isn't taking orders (closed wins), or it's past the rolls and nigiris cutoff */
export function useBoxLock(): { closed: boolean; blocked: boolean } {
  const closed = !useCanOrder();
  const pastCutoff = useScheduleStatus()?.isPastPreorderCutoff ?? false;
  return { closed, blocked: !closed && pastCutoff };
}

/**
 * The bar is on screen while the box can still change. A box left half-built when the cutoff hits
 * can't be finished, so its bar gives way to "Ver pedido"; only the confirmation of one just added stays.
 */
export const isBoxBarShown = (draft: BoxDraft, { closed, blocked }: { closed: boolean; blocked: boolean }): boolean =>
  !closed && (blocked ? draft.notice !== null : isBoxDraftActive(draft));

const boxTotal = (steps: BoxDraft['steps']): number =>
  Object.entries(steps).reduce((sum, [id, count]) => sum + (getBuildItemById(id)?.price ?? 0) * count, 0);

/** The fill after one more step of `item` */
const withOneMore = (fill: BoxFill, item: BuildItem): BoxFill =>
  item.group === 'rolls'
    ? { ...fill, rollPieces: fill.rollPieces + item.step }
    : { ...fill, nigiris: fill.nigiris + item.step };

/** "De a 5 piezas", "Por unidad" */
const stepLabel = (item: BuildItem): string =>
  item.step === 1 ? 'Por unidad' : `De a ${formatUnits(item.step, item.unitLabel)}`;

const GROUP_NOTES: Record<BuildItemGroup, (items: readonly BuildItem[]) => string> = {
  rolls: (items) => (items[0] ? stepLabel(items[0]) : ''),
  nigiris: (items) => (items[0] ? stepLabel(items[0]) : ''),
  // Not shown in the builder: acompañamientos have their own tab
  acompanamientos: () => '',
};

const CUTOFF_TITLE = `Se pueden pedir hasta las ${preorderCutoff}`;

interface BoxItemRowProps {
  item: BuildItem;
  steps: number;
  /** One more step still leads to a box that fits */
  fits: boolean;
  /** Past the preorder cutoff */
  blocked: boolean;
  /** The shop isn't taking orders: view-only */
  closed: boolean;
  onChange: (steps: number) => void;
  /** "+" before choosing a size: sends the customer to the size picker */
  onNeedSize: () => void;
  needsSize: boolean;
}

function BoxItemRow({ item, steps, fits, blocked, closed, onChange, onNeedSize, needsSize }: BoxItemRowProps) {
  const units = item.step * steps;
  const unavailable = !item.available || blocked;

  let control;
  if (!item.available) control = <HollowSeal>Agotado hoy</HollowSeal>;
  else if (closed) control = null;
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
      <div className="min-w-0">
        <h4 className={cn('font-title text-lg leading-snug wrap-anywhere', unavailable ? 'text-washi-muted' : 'text-washi')}>
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

interface BoxBuilderProps {
  draft: BoxDraft;
  onDraftChange: (draft: BoxDraft) => void;
  onOpenCart: () => void;
}

/** "Arma tu combo": pick a box and fill it with one of the combinations that fit (acompañamientos have their own tab) */
export function BoxBuilder({ draft, onDraftChange, onOpenCart }: BoxBuilderProps) {
  const addBox = useCartStore((state) => state.addBox);
  const replaceBox = useCartStore((state) => state.replaceBox);
  // Closed (day off or after closing) wins over the cutoff: nothing can be added at all
  const lock = useBoxLock();
  const { closed, blocked } = lock;
  const sizeRef = useRef<HTMLFieldSetElement>(null);
  const [askSize, setAskSize] = useState(false);

  const { size, steps, editingLineId, notice } = draft;
  const boxSize = size === null ? undefined : getBoxSize(size);
  const fill = getBoxFill(steps);
  const total = boxTotal(steps);
  const complete = boxSize !== undefined && isValidFill(boxSize, fill);
  const missing = boxSize ? getMissing(boxSize, fill) : null;
  // The other box, when the contents as they are would fit there
  const fitsElsewhere =
    boxSize && !complete ? BUILD_BOX_SIZES.find((other) => other.id !== boxSize.id && isValidFill(other, fill)) : undefined;

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
    if (size === null || !complete) return;
    const input: BoxInput = { size, steps };
    const stillInCart = editingLineId && useCartStore.getState().items.some((item) => item.lineId === editingLineId);
    if (editingLineId && stillInCart) replaceBox(editingLineId, input);
    else addBox(input);
    onDraftChange({ ...EMPTY_BOX_DRAFT, notice: editingLineId ? 'saved' : 'added' });
  };

  const cancelEdit = () => onDraftChange(EMPTY_BOX_DRAFT);

  // A box the contents no longer fit in
  const outgrown = BUILD_BOX_SIZES.find((candidate) => !canReachFill(candidate, fill));
  const showBar = isBoxBarShown(draft, lock);
  // "Ver pedido" takes the place of "Agregar": a double tap on "Agregar" must not open the cart
  const barSettled = useSettled(notice);
  const fillText = formatFill(fill);

  return (
    <div className="space-y-8">
      {closed && (
        <p className="rounded-xl border border-hairline-strong px-4 py-3 text-sm leading-relaxed text-washi">
          Ahora no tomamos pedidos. Podés ver el menú y armar tu pedido cuando abramos.
        </p>
      )}

      {blocked && (
        <p className="rounded-xl border border-hairline-strong px-4 py-3 text-sm leading-relaxed text-washi">
          Los rolls y nigiris se piden hasta las {preorderCutoff}. Los acompañamientos siguen disponibles en su pestaña.
        </p>
      )}

      <fieldset
        ref={sizeRef}
        disabled={blocked || closed}
        className={cn(
          'scroll-mt-32 rounded-xl transition-[outline-color] duration-300',
          askSize ? 'outline-2 outline-offset-8 outline-washi' : 'outline-transparent',
        )}
      >
        <legend className="mb-1 font-title text-xl text-washi">Tamaño de la caja</legend>
        <p className={cn('mb-3 text-sm', askSize ? 'font-bold text-washi' : 'text-washi-muted')}>
          {askSize ? 'Elegí la caja' : 'La llenás con rolls y nigiris, en una de las combinaciones que entran.'}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          {BUILD_BOX_SIZES.map((candidate) => {
            const selected = candidate.id === size;
            const disabled = blocked || closed || !canReachFill(candidate, fill);
            return (
              <label
                key={candidate.id}
                className={cn(
                  'flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-lg border px-2 text-center leading-tight transition-colors',
                  'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-washi',
                  selected ? 'border-washi bg-sumi-2 text-washi' : 'border-hairline-strong text-washi-muted',
                  !selected && !disabled && 'hover:border-washi-muted hover:text-washi',
                  disabled && 'cursor-default opacity-40',
                )}
              >
                <input
                  type="radio"
                  name="box-size"
                  checked={selected}
                  disabled={disabled}
                  onChange={() => update({ size: candidate.id })}
                  className="sr-only"
                />
                <span className="font-title text-lg">{candidate.name}</span>
                <span className="text-xs tabular-nums">hasta {candidate.maxPieces} piezas</span>
              </label>
            );
          })}
        </div>
        {boxSize && (
          <div className="mt-3">
            <p className="sr-only">Entran en la {boxSize.name.toLowerCase()}:</p>
            <ul className="space-y-0.5 text-sm text-washi-muted tabular-nums">
              {describeCombinations(boxSize).map((line) => (
                <li key={line} className="before:content-['·_']">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
        {outgrown && !blocked && !closed && (
          <p className="mt-2 text-sm text-washi-muted">Para la {outgrown.name.toLowerCase()}, sacá piezas.</p>
        )}
      </fieldset>

      {BUILD_ITEM_GROUPS.map((group) => {
        const items = getBuildItemsByGroup(group.id);
        // Acompañamientos have their own tab
        if (items.length === 0 || !items.every(isBoxItem)) return null;
        return (
          <section key={group.id} aria-labelledby={`group-${group.id}`}>
            <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-hairline pb-2">
              <h3 id={`group-${group.id}`} className="font-title text-xl text-washi">
                {group.name}
              </h3>
              <p className="text-sm text-washi-muted">
                {GROUP_NOTES[group.id](items)}
                <span className={cn(blocked && 'font-bold text-washi')}> · hasta las {preorderCutoff}</span>
              </p>
            </header>
            <ul className="grid @2xl:grid-cols-2 @2xl:gap-x-12">
              {items.map((item) => (
                <li key={item.id} className="border-b border-hairline">
                  <BoxItemRow
                    item={item}
                    steps={steps[item.id] ?? 0}
                    fits={boxSize !== undefined && canReachFill(boxSize, withOneMore(fill, item))}
                    blocked={blocked}
                    closed={closed}
                    needsSize={size === null}
                    onNeedSize={requestSize}
                    onChange={(count) => setSteps(item, count)}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p aria-live="polite" className="sr-only">
        {boxSize && !notice ? `${boxSize.name}: ${fillText || 'vacía'}. ${missing ? formatMissing(missing) : 'Completa'}.` : ''}
        {notice === 'added' ? 'Agregaste tu caja al pedido' : notice === 'saved' ? 'Guardamos los cambios de tu caja' : ''}
      </p>

      {showBar && (
        <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 @2xl:ml-auto @2xl:max-w-xl">
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 rounded-2xl bg-washi py-3 pr-3 pl-4 text-sumi shadow-lg shadow-black/50">
            <div className="min-w-0">
              <p className="text-[0.9375rem] leading-snug font-bold text-pretty tabular-nums">
                {notice === 'added'
                  ? 'Agregaste tu caja'
                  : notice === 'saved'
                    ? 'Guardamos los cambios'
                    : !boxSize
                      ? `${fillText} · elegí la caja`
                      : `${editingLineId ? 'Editando · ' : ''}${boxSize.name}${fillText ? ` · ${fillText}` : ''}`}
              </p>
              <p className="text-sm font-medium tabular-nums">
                {notice ? 'Podés armar otra o seguir con tu pedido.' : `Total ${formatPrice(total)}`}
              </p>
            </div>
            <div
              className={cn(
                'flex items-center gap-1',
                // Editing adds "Cancelar": on a narrow phone the buttons get their own row so the contents stay readable
                editingLineId && !notice && 'max-sm:col-span-2 max-sm:mt-2 max-sm:justify-end',
                notice && !barSettled && 'pointer-events-none',
              )}
            >
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
              ) : !boxSize ? (
                <BarButton onClick={requestSize} outline>
                  Elegí la caja
                </BarButton>
              ) : complete ? (
                <BarButton onClick={submit}>
                  {editingLineId ? 'Guardar' : 'Agregar'} · {formatPrice(total)}
                </BarButton>
              ) : (
                <BarButton disabled>{missing ? formatMissing(missing) : 'Sacá piezas'}</BarButton>
              )}
            </div>
            {fitsElsewhere && !notice && (
              <button
                type="button"
                onClick={() => update({ size: fitsElsewhere.id })}
                className="col-span-2 -ml-1 mt-1 h-9 justify-self-start rounded-lg px-1 text-left text-[0.8125rem] font-bold underline underline-offset-4 hover:bg-sumi/10 focus-visible:outline-2 focus-visible:outline-sumi"
              >
                Así como está, entra en la {fitsElsewhere.name.toLowerCase()}
              </button>
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
