import type { ViewName } from '../../types'
import { SurveillanceClock } from './SurveillanceClock'

interface Props {
  activeView: ViewName
  onViewChange: (view: ViewName) => void
}

const NAV_ITEMS: { view: ViewName; label: string; icon: string }[] = [
  { view: 'search', label: 'QUERY DATABASE', icon: '⌕' },
  { view: 'network', label: 'NETWORK ANALYSIS', icon: '◉' },
  { view: 'entities', label: 'SUBJECT FILES', icon: '⊟' },
  { view: 'person', label: 'PERSON DOSSIER', icon: '⊡' },
  { view: 'timeline', label: 'TEMPORAL ANALYSIS', icon: '▤' },
  { view: 'stats', label: 'CLASSIFIED BRIEFING', icon: '▦' },
]

export function Sidebar({ activeView, onViewChange }: Props) {
  return (
    <aside
      style={{
        width: '220px',
        minWidth: '220px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-typewriter)',
            fontSize: '20px',
            color: 'var(--blood)',
            letterSpacing: '0.04em',
            lineHeight: 1,
            marginBottom: '6px',
          }}
        >
          EXHIBIT A
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--bone-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            lineHeight: 1.4,
          }}
        >
          JMAIL ARCHIVE // DEPT. OF JUSTICE
          <br />
          CASE NO. 19-CR-490
        </div>
      </div>

      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeView === item.view
          return (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-typewriter)',
                fontSize: '12px',
                letterSpacing: '0.03em',
                color: isActive ? 'var(--bone)' : 'var(--bone-dim)',
                background: isActive ? 'var(--blood-faint)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--blood)' : '3px solid transparent',
                transition: 'all 0.15s',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-paper)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--bone)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--bone-dim)'
                }
              }}
            >
              <span style={{ fontSize: '14px', width: '18px', textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          )
        })}
      </nav>

      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--bone-muted)',
        }}
      >
        <kbd
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            background: 'var(--bg-elevated)',
            padding: '1px 4px',
            border: '1px solid var(--border)',
            borderRadius: '2px',
          }}
        >
          /
        </kbd>
        {' '}search
      </div>

      <SurveillanceClock />
    </aside>
  )
}
