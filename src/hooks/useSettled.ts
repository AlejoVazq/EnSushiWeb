'use client';

import { useEffect, useState } from 'react';

/** Long enough to swallow the second tap of a double tap, short enough to go unnoticed */
const DOUBLE_TAP_MS = 500;

/**
 * False for a moment after `key` changes (and after mounting). A control that just took the place of the one
 * that was tapped ignores taps meanwhile, so the second tap of a double tap doesn't trigger it.
 */
export function useSettled(key: unknown, ms: number = DOUBLE_TAP_MS): boolean {
  const [settledKey, setSettledKey] = useState<{ key: unknown } | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setSettledKey({ key }), ms);
    return () => clearTimeout(id);
  }, [key, ms]);

  return settledKey !== null && Object.is(settledKey.key, key);
}
