import { getBuildItemById, getBuildItemsByGroup } from '@/data/menu';
import type { BoxCombination, BuildBoxSize } from '@/types';

/** What's in a box so far: roll pieces and nigiris (a nigiri is one unit) */
export interface BoxFill {
  rollPieces: number;
  nigiris: number;
}

/** Steps per build item id → roll pieces and nigiris; acompañamientos and unknown ids don't count */
export const getBoxFill = (steps: Readonly<Record<string, number>>): BoxFill =>
  Object.entries(steps).reduce<BoxFill>(
    (fill, [id, count]) => {
      const item = getBuildItemById(id);
      if (item?.group === 'rolls') return { ...fill, rollPieces: fill.rollPieces + item.step * count };
      if (item?.group === 'nigiris') return { ...fill, nigiris: fill.nigiris + item.step * count };
      return fill;
    },
    { rollPieces: 0, nigiris: 0 },
  );

export const isEmptyFill = (fill: BoxFill): boolean => fill.rollPieces === 0 && fill.nigiris === 0;

const matches = (combination: BoxCombination, { rollPieces, nigiris }: BoxFill): boolean =>
  combination.rollPieces === rollPieces && nigiris >= combination.nigiris.min && nigiris <= combination.nigiris.max;

/** Reachable by adding more: rolls and nigiris only grow, so a combination with fewer is out of reach */
const reaches = (combination: BoxCombination, { rollPieces, nigiris }: BoxFill): boolean =>
  rollPieces <= combination.rollPieces && nigiris <= combination.nigiris.max;

/** The box can be added as it is */
export const isValidFill = (size: BuildBoxSize, fill: BoxFill): boolean =>
  size.combinations.some((combination) => matches(combination, fill));

/** Adding more can still end in a valid box (used to switch off "+" and box chips) */
export const canReachFill = (size: BuildBoxSize, fill: BoxFill): boolean =>
  size.combinations.some((combination) => reaches(combination, fill));

/** Pieces per "+" of a roll (all rolls share it) */
const ROLL_STEP = getBuildItemsByGroup('rolls')[0]?.step ?? 5;

/** Taps it takes to add `missing`, and how many kinds of item: fewer taps first, then rolls or nigiris alone */
const effort = ({ rollPieces, nigiris }: BoxFill): [number, number] => [
  Math.ceil(rollPieces / ROLL_STEP) + nigiris,
  Number(rollPieces > 0) + Number(nigiris > 0),
];

/** The simplest way to complete the box, or null if it's complete (or can't be completed) */
export const getMissing = (size: BuildBoxSize, fill: BoxFill): BoxFill | null => {
  if (isValidFill(size, fill)) return null;
  let best: BoxFill | null = null;
  for (const combination of size.combinations) {
    if (!reaches(combination, fill)) continue;
    const missing = {
      rollPieces: combination.rollPieces - fill.rollPieces,
      nigiris: Math.max(0, combination.nigiris.min - fill.nigiris),
    };
    if (!best) {
      best = missing;
      continue;
    }
    const [taps, kinds] = effort(missing);
    const [bestTaps, bestKinds] = effort(best);
    if (taps < bestTaps || (taps === bestTaps && kinds < bestKinds)) best = missing;
  }
  return best;
};

const pieces = (count: number): string => `${count} ${count === 1 ? 'pieza' : 'piezas'}`;
const nigiris = (count: number): string => `${count} ${count === 1 ? 'nigiri' : 'nigiris'}`;

/** "15 piezas", "15 piezas + 3 nigiris", "6 nigiris"; "" when empty */
export const formatFill = (fill: BoxFill): string =>
  [fill.rollPieces > 0 && pieces(fill.rollPieces), fill.nigiris > 0 && nigiris(fill.nigiris)]
    .filter(Boolean)
    .join(' + ');

/** "Faltan 5 piezas", "Falta 1 nigiri", "Faltan 5 piezas y 1 nigiri" */
export const formatMissing = (missing: BoxFill): string => {
  const parts = [missing.rollPieces > 0 && pieces(missing.rollPieces), missing.nigiris > 0 && nigiris(missing.nigiris)].filter(
    (part): part is string => Boolean(part),
  );
  const total = missing.rollPieces + missing.nigiris;
  return `${total === 1 ? 'Falta' : 'Faltan'} ${parts.join(' y ')}`;
};

/** "30, 25 o 20" */
const orList = (values: readonly number[]): string =>
  values.length > 1 ? `${values.slice(0, -1).join(', ')} o ${values[values.length - 1]}` : String(values[0] ?? '');

const nigiriRange = ({ min, max }: BoxCombination['nigiris']): string =>
  min === 0 ? `hasta ${nigiris(max)}` : min === max ? nigiris(min) : `${min} a ${max} nigiris`;

/**
 * What fits in the box, for the list under the chips:
 * "30 o 25 piezas de rolls", "20 piezas + hasta 6 nigiris", "15 piezas + 1 a 9 nigiris", "6 a 8 nigiris"
 */
export const describeCombinations = (size: BuildBoxSize): string[] => {
  const rollsOnly = size.combinations.filter((c) => c.nigiris.max === 0).map((c) => c.rollPieces);
  const lines = rollsOnly.length > 0 ? [`${orList(rollsOnly)} piezas de rolls`] : [];
  for (const combination of size.combinations) {
    if (combination.nigiris.max === 0) continue;
    const range = nigiriRange(combination.nigiris);
    lines.push(combination.rollPieces === 0 ? range : `${pieces(combination.rollPieces)} + ${range}`);
  }
  return lines;
};
