import type { SearchResult } from '../../types'
import { avatarColor, initials, fmtDate, exhibitId } from '../../utils'
import { EvidenceTag } from '../ui/EvidenceTag'

interface Props {
  result: SearchResult
  index: number
  onClick: () => void
}

export function ResultCard({ result, index, onClick }: Props) {
  const color = avatarColor(result.sender_email)
  const ini = initials(result.sender_name)
  const isEpstein = (result.sender_email || '').toLowerCase().includes('epstein')

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-paper)',
        borderLeft: `3px solid ${isEpstein ? 'var(--blood)' : 'var(--border)'}`,
        borderTop: '1px solid var(--border-subtle)',
        borderRight: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius)',
        padding: '14px 18px',
        marginBottom: '6px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--bg-manila)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateX(2px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--bg-paper)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateX(0)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            opacity: 0.8,
          }}
        >
          {ini}
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '12px' }}>
          {result.sender_name || result.sender_email || 'Unknown'}
        </span>
        {isEpstein && (
          <span
            style={{
              fontFamily: 'var(--font-typewriter)',
              fontSize: '9px',
              color: 'var(--blood-bright)',
              background: 'var(--blood-glow)',
              padding: '1px 6px',
              border: '1px solid var(--blood)',
              borderRadius: 'var(--radius)',
              letterSpacing: '0.08em',
            }}
          >
            SUBJECT
          </span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--evidence-yellow-dim)',
            flexShrink: 0,
          }}
        >
          {fmtDate(result.sent_at)}
        </span>
        <EvidenceTag id={exhibitId(index)} />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '4px',
          color: 'var(--bone)',
        }}
      >
        {result.subject || '(no subject)'}
      </div>
      {result.snippet && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--bone-dim)',
            lineHeight: 1.5,
          }}
          dangerouslySetInnerHTML={{ __html: result.snippet }}
        />
      )}

      <style>{`
        div mark {
          background: var(--highlight);
          color: var(--evidence-yellow);
          padding: 1px 2px;
          border-radius: 1px;
        }
      `}</style>
    </div>
  )
}
