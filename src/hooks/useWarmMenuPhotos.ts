'use client';

import { getImageProps } from 'next/image';
import { useEffect } from 'react';

import { PRODUCTS } from '@/data/menu';

/** `sizes` of the menu row photo (ProductRow): warming must ask for the same file the row will */
export const MENU_PHOTO_SIZES = '(min-width: 640px) 104px, 88px';

/** Network Information API (Chrome/Android); not in TypeScript's DOM lib */
interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

const menuPhotos = (): string[] => [
  ...new Set(
    PRODUCTS.flatMap((product) => [
      product.imageUrl,
      ...(product.type === 'standard' && product.option ? product.option.values.map((value) => value.imageUrl) : []),
    ]).filter((url): url is string => Boolean(url)),
  ),
];

/**
 * The menu opens on Arma tu combo, with no photos; the other tabs only fetch theirs when tapped, and on a weak
 * signal they pop in a second or two later. Once the page is idle, fetch them at low priority so the tabs open
 * with their photos ready. Skipped when the phone asks to save data or is on 2G.
 */
export function useWarmMenuPhotos() {
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection?.saveData || /2g/.test(connection?.effectiveType ?? '')) return;

    const warming: HTMLImageElement[] = [];
    const warm = () => {
      for (const src of menuPhotos()) {
        const { props } = getImageProps({ src, alt: '', fill: true, sizes: MENU_PHOTO_SIZES });
        const img = new Image();
        img.fetchPriority = 'low';
        // sizes before srcset, so the browser picks the same width as the row's <img>
        if (props.sizes) img.sizes = props.sizes;
        if (props.srcSet) img.srcset = props.srcSet;
        img.src = props.src;
        warming.push(img);
      }
    };

    // Safari has no requestIdleCallback
    const hasIdle = typeof window.requestIdleCallback === 'function';
    let idle = 0;
    const schedule = () => {
      idle = hasIdle ? window.requestIdleCallback(warm, { timeout: 4000 }) : window.setTimeout(warm, 1500);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });

    return () => {
      window.removeEventListener('load', schedule);
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      warming.length = 0;
    };
  }, []);
}
