import { ImageResponse } from 'next/og';

export const alt = 'Mylkio: smarter dairy farming, made simple';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The picture shown when the website is shared on WhatsApp or social media.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 90, background: '#345C4A', color: '#FAF9F5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 84, height: 84, borderRadius: 42, background: '#FAF9F5', color: '#345C4A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, fontWeight: 700 }}>M</div>
          <div style={{ fontSize: 60, fontWeight: 700 }}>Mylkio</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 76, fontWeight: 700, lineHeight: 1.1, maxWidth: 980 }}>Smarter dairy farming, made simple.</div>
        <div style={{ marginTop: 32, fontSize: 34, color: '#C6A76A' }}>Milk, herd, sales and health records for Kenyan farmers</div>
      </div>
    ),
    size,
  );
}
