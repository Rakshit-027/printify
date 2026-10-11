import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Print2Me – Fast Online Document Printing & Campus Xerox Network';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#0c0f17',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              backgroundColor: '#ff6b35',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '26px',
              fontWeight: 800,
            }}
          >
            P
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#ffffff', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Print2Me
            </span>
            <span style={{ color: '#94a3b8', fontSize: '14px', letterSpacing: '1px' }}>
              print2me.in
            </span>
          </div>
        </div>

        {/* Center Main Message */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(255, 107, 53, 0.15)',
              padding: '8px 20px',
              borderRadius: '999px',
              color: '#ff8a5c',
              fontSize: '18px',
              fontWeight: 700,
            }}
          >
            <span>⚡ THE MODERN CAMPUS & COUNTER PRINTING NETWORK</span>
          </div>

          <h1
            style={{
              color: '#ffffff',
              fontSize: '60px',
              fontWeight: 800,
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: '-1.5px',
            }}
          >
            Skip the line. Print in <span style={{ color: '#ff6b35' }}>seconds</span>.
          </h1>

          <p
            style={{
              color: '#cbd5e1',
              fontSize: '24px',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Scan counter QR code, upload documents from your phone, pay online, and collect your fresh prints.
          </p>
        </div>

        {/* Bottom Feature Badges */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#1e293b',
              padding: '10px 20px',
              borderRadius: '14px',
              color: '#e2e8f0',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            <span>📱 No App Downloads</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#1e293b',
              padding: '10px 20px',
              borderRadius: '14px',
              color: '#e2e8f0',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            <span>🔒 100% Private & Encrypted</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#1e293b',
              padding: '10px 20px',
              borderRadius: '14px',
              color: '#e2e8f0',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            <span>⚡ Instant Spooler Release</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
