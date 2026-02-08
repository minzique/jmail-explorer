import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export function Shell({ children }: Props) {
  return (
    <div
      className="scanlines vignette"
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        position: 'relative',
      }}
    >
      {children}

      <div className="grain-overlay" aria-hidden="true">
        <svg>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </div>
    </div>
  )
}
