import { useState, useEffect, useCallback } from 'react'
import type { PersonResponse } from '../../types'
import { getPerson } from '../../api'
import { PersonSearch } from './PersonSearch'
import { Spinner } from '../ui/Spinner'
import { fmtDate, avatarColor, initials } from '../../utils'

interface PersonViewProps {
  email: string | null
  onOpenThread: (docId: string) => void
  onViewNetwork: (email: string) => void
  onViewPerson: (email: string) => void
}

const ROLE_COLORS: Record<string, string> = {
  principal: '#cc1100',
  inner_circle: '#8b0000',
  legal: '#4a6a8a',
  political: '#8a7a20',
  financial: '#3a6a4a',
  social: '#6a4a6a',
  unknown: '#5a5347',
}

export function PersonView({
  email,
  onOpenThread,
  onViewNetwork,
  onViewPerson,
}: PersonViewProps) {
  const [data, setData] = useState<PersonResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState('')

  useEffect(() => {
    if (!email) {
      setData(null)
      return
    }

    setLoading(true)
    setError(null)
    getPerson(email)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [email])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterQuery(e.target.value)
  }, [])

  if (!email) {
    return <PersonSearch onSelectPerson={onViewPerson} />
  }

  if (loading) {
    return (
      <div className="page-enter" style={{ minHeight: '100%', position: 'relative' }}>
        <div className="watermark" />
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-enter" style={{ padding: '40px', color: 'var(--blood)' }}>
        <div className="watermark" />
        ERROR LOADING DOSSIER: {error}
      </div>
    )
  }

  if (!data) return null

  const { profile, connections, recent_sent, recent_received, activity_timeline, mention_summary } = data

  const filteredConnections = connections.filter(
    (c) =>
      c.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(filterQuery.toLowerCase())
  )

  const maxActivity = Math.max(...activity_timeline.map((a) => a.cnt), 1)

  return (
    <div
      className="page-enter"
      style={{
        padding: '24px 32px',
        minHeight: '100%',
        position: 'relative',
        color: 'var(--bone)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div className="watermark" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-typewriter)',
              fontSize: '20px',
              color: 'var(--stamp-red)',
              letterSpacing: '0.04em',
              margin: '0 0 4px 0',
              fontWeight: 'normal',
            }}
          >
            DOSSIER // {profile.canonical_name.toUpperCase()}
          </h1>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--bone-muted)',
            }}
          >
            {profile.email}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '32px',
            padding: '24px',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '22px',
                color: 'var(--bone)',
              }}
            >
              {profile.canonical_name}
            </span>
            <span
              style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: `${ROLE_COLORS[profile.role] || ROLE_COLORS.unknown}33`,
                color: ROLE_COLORS[profile.role] || ROLE_COLORS.unknown,
                border: `1px solid ${ROLE_COLORS[profile.role] || ROLE_COLORS.unknown}`,
              }}
            >
              {profile.role}
            </span>
          </div>

          {!!profile.is_epstein && (
            <div
              style={{
                background: 'var(--blood)',
                color: '#fff',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 'bold',
                textAlign: 'center',
                letterSpacing: '0.05em',
              }}
            >
              ⚠ EPSTEIN ACCOUNT
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {profile.all_emails.map((e) => (
              <span
                key={e}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  color: 'var(--bone-muted)',
                }}
              >
                {e}
              </span>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '24px',
              fontSize: '11px',
              color: 'var(--evidence-yellow)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>MSGS: {profile.total_messages}</span>
            <span>THREADS: {profile.total_threads}</span>
            <span>CONNECTIONS: {profile.total_connections}</span>
          </div>

          <div style={{ fontSize: '10px', color: 'var(--bone-muted)' }}>
            ACTIVE: {fmtDate(profile.first_active)} — {fmtDate(profile.last_active)}
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <div className="section-divider" style={{ marginBottom: '12px' }}>
            ACTIVITY TIMELINE
          </div>
          <div style={{ height: '50px', width: '100%' }}>
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${activity_timeline.length * 4} 50`}
              preserveAspectRatio="none"
            >
              {activity_timeline.map((entry, i) => {
                const height = (entry.cnt / maxActivity) * 50
                return (
                  <rect
                    key={entry.month}
                    x={i * 4}
                    y={50 - height}
                    width={3}
                    height={height}
                    fill="rgba(139,0,0,0.6)"
                    className="spark-bar"
                    style={{ transition: 'fill 0.2s' }}
                  >
                    <title>{`${entry.month}: ${entry.cnt} messages`}</title>
                  </rect>
                )
              })}
            </svg>
            <style>{`
              .spark-bar:hover { fill: rgba(139,0,0,0.9); }
            `}</style>
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <div className="section-divider" style={{ margin: 0 }}>
              KNOWN ASSOCIATES ({connections.length})
            </div>
            <input
              type="text"
              placeholder="FILTER ASSOCIATES..."
              value={filterQuery}
              onChange={handleSearchChange}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--bone)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                padding: '4px 8px',
                width: '200px',
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '8px',
            }}
          >
            {filteredConnections.map((conn) => (
              <div
                key={conn.email}
                onClick={() => onViewPerson(conn.email)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius)',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-manila)'
                  e.currentTarget.style.borderColor = 'var(--evidence-yellow-dim)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-surface)'
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: avatarColor(conn.name),
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}
                  >
                    {initials(conn.name)}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {conn.name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        color: 'var(--bone-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {conn.email}
                    </div>
                  </div>
                  <div
                    style={{
                      marginLeft: 'auto',
                      color: 'var(--evidence-yellow)',
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {conn.total_weight}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                  {Object.entries(conn.types).map(([type, count]) => {
                    let style = {}
                    if (type === 'direct_email') {
                      style = {
                        background: 'rgba(139,0,0,0.15)',
                        color: '#8b0000',
                        borderLeft: '2px solid #8b0000',
                      }
                    } else if (type === 'co-participant') {
                      style = {
                        background: 'rgba(196,160,0,0.1)',
                        color: '#c4a000',
                        borderLeft: '2px dashed #c4a000',
                      }
                    } else if (type === 'forwarded') {
                      style = {
                        background: 'rgba(138,126,106,0.1)',
                        color: '#8a7e6a',
                        borderLeft: '2px dotted #8a7e6a',
                      }
                    }
                    return (
                      <span
                        key={type}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: '2px',
                          ...style,
                        }}
                      >
                        {type}: {count}
                      </span>
                    )
                  })}
                </div>

                <div style={{ fontSize: '9px', color: 'var(--bone-muted)', textAlign: 'right' }}>
                  {fmtDate(conn.first_seen)} — {fmtDate(conn.last_seen)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <div className="section-divider">SENT COMMUNICATIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {recent_sent.slice(0, 20).map((msg) => (
              <div
                key={msg.id}
                onClick={() => onOpenThread(msg.doc_id)}
                style={{
                  padding: '8px',
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-manila)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: 'var(--bone)',
                    }}
                  >
                    {msg.subject || '(No Subject)'}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--evidence-yellow-dim)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fmtDate(msg.sent_at)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--bone-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {msg.preview}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <div className="section-divider">RECEIVED COMMUNICATIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {recent_received.slice(0, 20).map((msg) => (
              <div
                key={msg.id}
                onClick={() => onOpenThread(msg.doc_id)}
                style={{
                  padding: '8px',
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-manila)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: 'var(--bone)',
                    }}
                  >
                    {msg.subject || '(No Subject)'}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--evidence-yellow-dim)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {fmtDate(msg.sent_at)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'var(--bone-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '70%',
                    }}
                  >
                    {msg.preview}
                  </div>
                  {msg.sender_name && (
                    <div
                      style={{
                        fontSize: '9px',
                        color: 'var(--bone-dim)',
                        fontStyle: 'italic',
                      }}
                    >
                      From: {msg.sender_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {mention_summary.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div className="section-divider">MENTIONS BY TYPE</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {mention_summary.map((m) => (
                <div
                  key={m.mention_type}
                  style={{
                    padding: '4px 8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span style={{ color: 'var(--bone-muted)' }}>{m.mention_type}:</span>{' '}
                  <span style={{ color: 'var(--evidence-yellow)', fontWeight: 'bold' }}>{m.cnt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          <button
            onClick={() => onViewNetwork(profile.email)}
            style={{
              fontFamily: 'var(--font-typewriter)',
              fontSize: '10px',
              color: 'var(--evidence-yellow)',
              letterSpacing: '0.06em',
              padding: '6px 14px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-surface)',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-manila)'
              e.currentTarget.style.borderColor = 'var(--evidence-yellow)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-surface)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            VIEW EGO NETWORK
          </button>
        </div>
      </div>
    </div>
  )
}
