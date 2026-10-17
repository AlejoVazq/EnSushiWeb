'use client';

import Image from 'next/image';
import { useState } from 'react';

interface ProductImageProps {
  src?: string;
  alt: string;
}

function ImagePlaceholder() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-surface-2 bg-[radial-gradient(ellipse_at_30%_20%,#2b2320,transparent_60%),radial-gradient(ellipse_at_80%_90%,#201b1a,transparent_55%)]">
      <svg viewBox="0 0 64 64" className="size-14 text-line-strong" aria-hidden="true">
        <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="32" cy="32" r="15" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="32" cy="32" r="6" className="fill-accent/40" />
      </svg>
    </div>
  );
}

/** Falls back to a placeholder when the product has no image or the file fails to load. */
export function ProductImage({ src, alt }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <ImagePlaceholder />;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      onError={() => setFailed(true)}
      // The error can fire before hydration attaches onError; catch already-broken images here
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setFailed(true);
      }}
    />
  );
}
