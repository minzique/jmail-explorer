import { useState, useEffect } from 'react'

export function SurveillanceClock() {
  const [time, setTime] = useState(formatTime())

  useEffect(() => {
    const interval = setInterval(() => setTime(formatTime()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="flicker"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--bone-muted)',
        letterSpacing: '0.05em',
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div style={{ color: 'var(--evidence-yellow-dim)', fontSize: '9px', marginBottom: '2px' }}>
        SYS.CLOCK
      </div>
      {time}
    </div>
  )
}

function formatTime(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const h = String(now.getUTCHours()).padStart(2, '0')
  const min = String(now.getUTCMinutes()).padStart(2, '0')
  const s = String(now.getUTCSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}:${s} UTC`
}
