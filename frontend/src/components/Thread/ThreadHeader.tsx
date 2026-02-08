import type { Thread } from '../../types'
import { fmtDate } from '../../utils'

interface Props {
  thread: Thread
  onClose: () => void
}

export function ThreadHeader({ thread, onClose }: Props) {
  return (
    <div
      style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        background: 'var(--bg-surface)',
        zIndex: 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-typewriter)',
              fontSize: '10px',
              color: 'var(--stamp-red)',
              letterSpacing: '0.08em',
              marginBottom: '8px',
            }}
          >
            THREAD EXHIBIT // {thread.doc_id.slice(0, 12).toUpperCase()}
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--bone)',
              lineHeight: 1.4,
              marginBottom: '8px',
            }}
          >
            {thread.subject || '(no subject)'}
          </h2>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--bone-muted)',
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <span>{thread.message_count} message{thread.message_count !== 1 ? 's' : ''}</span>
            <span>{fmtDate(thread.latest_date)}</span>
            {thread.attachment_count > 0 && (
              <span style={{ color: 'var(--evidence-yellow)' }}>📎 {thread.attachment_count} attachments</span>
            )}
            {thread.has_redactions > 0 && (
              <span style={{ color: 'var(--blood)' }}>REDACTED</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            fontFamily: 'var(--font-typewriter)',
            fontSize: '10px',
            color: 'var(--bone-dim)',
            padding: '6px 12px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--bg-paper)',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--blood)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--blood-bright)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--bone-dim)'
          }}
        >
          ✕ CLOSE FILE
        </button>
      </div>
    </div>
  )
}
