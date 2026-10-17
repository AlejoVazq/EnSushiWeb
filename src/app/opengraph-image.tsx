import { ImageResponse } from 'next/og';

import { BUSINESS } from '@/config/business';

export const alt = `${BUSINESS.name} · Pedidos online`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Text-only share image until the brand logo is ready. Colors mirror the tokens in globals.css. */
export default function OpengraphImage() {
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
        <div style={{ fontSize: 140, fontWeight: 600, letterSpacing: -2 }}>{BUSINESS.name}</div>
        <div style={{ width: 120, height: 4, background: '#f0805a', margin: '28px 0' }} />
        <div style={{ fontSize: 44, color: '#a8a39a' }}>Pedí online y confirmá por WhatsApp</div>
      </div>
    ),
    { ...size },
  );
}
