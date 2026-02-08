import { useEffect, useState } from 'react'
import { getEntity } from '../../api'
import type { EntityDetailResponse } from '../../types'
import { avatarColor, initials, fmtDate } from '../../utils'
import { ClassifiedBadge } from '../ui/ClassifiedBadge'
import { Spinner } from '../ui/Spinner'

interface Props {
  email: string
  onOpenThread: (docId: string) => void
  onViewNetwork: (email: string) => void
  onNavigate: (email: string) => void
  onViewPerson?: (email: string) => void
}

export function EntityDetail({ email, onOpenThread, onViewNetwork, onNavigate, onViewPerson }: Props) {
  const [data, setData] = useState<EntityDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getEntity(email)
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [email])

  if (loading) return <Spinner />
  if (!data) return <div style={{ padding: '20px', color: 'var(--bone-muted)', fontFamily: 'var(--font-typewriter)' }}>SUBJECT NOT FOUND</div>

  const e = data.entity

  return (
    <div
      className="page-enter"
      style={{
        background: 'var(--bg-paper)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '24px',
        marginTop: '16px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-typewriter)',
          fontSize: '10px',
          color: 'var(--stamp-red)',
          letterSpacing: '0.08em',
          marginBottom: '12px',
        }}
      >
        DOSSIER // {e.name?.toUpperCase() || e.email.toUpperCase()}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 600, color: 'var(--bone)' }}>
          {e.name || 'Unknown'}
        </h3>
        {e.is_epstein > 0 && <ClassifiedBadge />}
      </div>

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--bone-muted)', marginBottom: '16px' }}>
        {e.email} · {e.message_count} messages
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => onViewNetwork(e.email)}
          style={{
            fontFamily: 'var(--font-typewriter)',
            fontSize: '10px',
            color: 'var(--evidence-yellow)',
            letterSpacing: '0.06em',
            padding: '4px 12px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--bg-surface)',
            cursor: 'pointer',
          }}
        >
          VIEW EGO NETWORK →
        </button>
        {onViewPerson && (
          <button
            onClick={() => onViewPerson(email)}
            style={{
              fontFamily: 'var(--font-typewriter)',
              fontSize: '10px',
              color: 'var(--stamp-red)',
              letterSpacing: '0.06em',
              padding: '4px 12px',
              border: '1px solid var(--blood)',
              borderRadius: 'var(--radius)',
              background: 'var(--blood-faint)',
              cursor: 'pointer',
              marginLeft: '8px',
            }}
          >
            VIEW FULL DOSSIER →
          </button>
        )}
      </div>

      {data.connections.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div className="section-divider">KNOWN ASSOCIATES</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px' }}>
            {data.connections.map(c => {
              const col = avatarColor(c.email)
              return (
                <div
                  key={c.email}
                  onClick={() => onNavigate(c.email)}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius)',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--evidence-yellow-dim)'
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-manila)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'
                  }}
                >
                  <div
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: col, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', fontWeight: 700, color: '#fff', flexShrink: 0, opacity: 0.8,
                    }}
                  >
                    {initials(c.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name || c.email}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--bone-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.email}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--evidence-yellow)', flexShrink: 0 }}>
                    {c.connection_weight}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {data.recent_messages.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div className="section-divider">RECENT COMMUNICATIONS</div>
          {data.recent_messages.map(m => (
            <div
              key={m.id}
              onClick={() => onOpenThread(m.doc_id)}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-manila)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>
                  {m.subject || '(no subject)'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--evidence-yellow-dim)', flexShrink: 0 }}>
                  {fmtDate(m.sent_at)}
                </span>
              </div>
              {m.preview && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--bone-muted)', marginTop: '2px' }}>
                  {m.preview.slice(0, 120)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
