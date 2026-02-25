import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'PLATA MIA — Private Stealth Payments'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(145deg, #050805 0%, #0A1A0A 50%, #050805 100%)',
          position: 'relative',
        }}
      >
        {/* Top border accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: '#00FF41',
            display: 'flex',
          }}
        />

        {/* Glow behind title */}
        <div
          style={{
            position: 'absolute',
            width: '500px',
            height: '200px',
            background: 'radial-gradient(ellipse, rgba(0,255,65,0.08) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: '80px',
              fontWeight: 700,
              color: '#00FF41',
              letterSpacing: '0.15em',
              fontFamily: 'monospace',
              display: 'flex',
            }}
          >
            PLATA_MIA
          </div>

          <div
            style={{
              fontSize: '24px',
              color: 'rgba(192, 255, 192, 0.55)',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              fontFamily: 'monospace',
              display: 'flex',
            }}
          >
            Private Stealth Payments
          </div>

          {/* Separator */}
          <div
            style={{
              width: '120px',
              height: '1px',
              background: 'rgba(0, 255, 65, 0.3)',
              margin: '8px 0',
              display: 'flex',
            }}
          />

          <div
            style={{
              fontSize: '15px',
              color: 'rgba(192, 255, 192, 0.3)',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              fontFamily: 'monospace',
              display: 'flex',
              gap: '16px',
            }}
          >
            <span>Stealth Addresses</span>
            <span style={{ color: 'rgba(0,255,65,0.3)' }}>·</span>
            <span>Hyperbridge</span>
            <span style={{ color: 'rgba(0,255,65,0.3)' }}>·</span>
            <span>xx-network</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
