import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { BUSINESS } from '@/config/business';

export const alt = `${BUSINESS.name} · Pedidos online`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Share image with the brand logo. Colors mirror the tokens in globals.css. */
export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), 'public/logo.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at 30% 20%, #2b2320, #0b0b0c 65%)',
          color: '#f4efe6',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse only renders plain <img> */}
        <img src={logoSrc} alt={BUSINESS.name} width={720} height={239} />
        <div style={{ width: 120, height: 4, background: '#f0805a', margin: '28px 0' }} />
        <div style={{ fontSize: 44, color: '#a8a39a' }}>Pedí online y confirmá por WhatsApp</div>
      </div>
    ),
    { ...size },
  );
}
