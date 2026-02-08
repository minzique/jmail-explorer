import { useState, useEffect } from 'react'
import { getStats } from '../../api'
import type { Stats } from '../../types'
import { Spinner } from '../ui/Spinner'
import { fmtDate } from '../../utils'

interface Props {
  onViewPerson?: (email: string) => void
}

export function StatsView({ onViewPerson }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStats()
      .then(s => { setStats(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!stats) return <div style={{ padding: '40px', color: 'var(--bone-muted)', fontFamily: 'var(--font-typewriter)' }}>BRIEFING UNAVAILABLE</div>

  const statCards = [
    { label: 'THREADS', value: stats.threads.toLocaleString() },
    { label: 'MESSAGES', value: stats.messages.toLocaleString() },
    { label: 'ENTITIES', value: stats.entities.toLocaleString() },
    { label: 'CONNECTIONS', value: stats.edges.toLocaleString() },
    { label: 'RELATIONSHIPS', value: stats.relationships?.toLocaleString() || '0' },
    { label: 'PROFILES', value: stats.profiles?.toLocaleString() || '0' },
    { label: 'EARLIEST', value: fmtDate(stats.min_date), small: true },
    { label: 'LATEST', value: fmtDate(stats.max_date), small: true },
  ]

  const maxSend = stats.top_senders[0]?.cnt || 1
  const maxDom = stats.top_domains[0]?.cnt || 1

  return (
    <div className="page-enter" style={{ padding: '24px 32px', minHeight: '100%', position: 'relative' }}>
      <div className="watermark" />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-typewriter)',
            fontSize: '20px',
            color: 'var(--bone)',
            marginBottom: '4px',
          }}
        >
          CLASSIFIED BRIEFING
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--bone-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '24px',
          }}
        >
          ARCHIVE OVERVIEW // STATISTICAL SUMMARY
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '10px',
            marginBottom: '32px',
          }}
        >
          {statCards.map(c => (
            <div
              key={c.label}
              style={{
                background: 'var(--bg-paper)',
                border: '1px solid var(--border-subtle)',
                borderBottom: '2px solid var(--blood)',
                borderRadius: 'var(--radius)',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: 'var(--evidence-yellow)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '6px',
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: c.small ? '14px' : '24px',
                  fontWeight: 700,
                  color: 'var(--bone)',
                }}
              >
                {c.value}
              </div>
            </div>
          ))}
        </div>

        <div className="section-divider">TOP 10 SENDERS</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px' }}>
          <thead>
            <tr>
              {['#', 'NAME', 'EMAIL', 'COUNT', ''].map(h => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontFamily: 'var(--font-typewriter)',
                    fontSize: '9px',
                    color: 'var(--bone-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.top_senders.map((r, i) => (
              <tr key={r.sender_email}>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--bone-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                  {String(i + 1).padStart(2, '0')}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                  {r.sender_name || '\u2014'}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--bone-dim)', borderBottom: '1px solid var(--border-subtle)' }}>
                  {r.sender_email}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                  {r.cnt}
                </td>
                <td style={{ padding: '8px 12px', width: '30%', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ background: 'var(--bg-surface)', borderRadius: '1px', height: '5px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--blood)', borderRadius: '1px', width: `${(r.cnt / maxSend * 100).toFixed(1)}%`, transition: 'width 0.4s ease' }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="section-divider">TOP 10 DOMAINS</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px' }}>
          <thead>
            <tr>
              {['#', 'DOMAIN', 'COUNT', ''].map(h => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontFamily: 'var(--font-typewriter)',
                    fontSize: '9px',
                    color: 'var(--bone-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.top_domains.map((r, i) => (
              <tr key={r.domain}>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--bone-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                  {String(i + 1).padStart(2, '0')}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                  {r.domain}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                  {r.cnt}
                </td>
                <td style={{ padding: '8px 12px', width: '30%', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ background: 'var(--bg-surface)', borderRadius: '1px', height: '5px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--blood)', borderRadius: '1px', width: `${(r.cnt / maxDom * 100).toFixed(1)}%`, transition: 'width 0.4s ease' }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {stats.relationships_by_type && stats.relationships_by_type.length > 0 && (
          <>
            <div className="section-divider">RELATIONSHIPS BY TYPE</div>
            <div style={{ marginBottom: '28px' }}>
              {stats.relationships_by_type.map(r => {
                const max = Math.max(...stats.relationships_by_type!.map(x => x.cnt))
                const color = r.relationship_type === 'direct_email' ? 'var(--blood)' :
                              r.relationship_type === 'co-participant' ? 'var(--evidence-yellow)' :
                              'var(--bone-dim)'
                return (
                  <div key={r.relationship_type} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--bone-muted)' }}>
                      <span style={{ textTransform: 'uppercase' }}>{r.relationship_type.replace('_', ' ')}</span>
                      <span>{r.cnt.toLocaleString()}</span>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', height: '6px', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${(r.cnt / max * 100).toFixed(1)}%`, background: color, height: '100%' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {stats.top_connected && stats.top_connected.length > 0 && (
          <>
            <div className="section-divider">TOP CONNECTED ENTITIES</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'NAME', 'EMAIL', 'CONNECTIONS', 'ROLE'].map(h => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '8px 12px',
                        fontFamily: 'var(--font-typewriter)',
                        fontSize: '9px',
                        color: 'var(--bone-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.top_connected.map((r, i) => {
                  const roleColor = r.role === 'inner_circle' ? '#8b0000' :
                                    r.role === 'legal' ? '#4a6a8a' :
                                    r.role === 'political' ? '#8a7a20' :
                                    r.role === 'financial' ? '#3a6a4a' :
                                    r.role === 'social' ? '#6a4a6a' :
                                    r.role === 'principal' ? '#cc1100' :
                                    'var(--bone-muted)'
                  return (
                    <tr
                      key={r.email}
                      onClick={() => onViewPerson?.(r.email)}
                      style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-manila)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--bone-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                        {r.canonical_name || '\u2014'}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--bone-dim)', borderBottom: '1px solid var(--border-subtle)' }}>
                        {r.email}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                        {r.total_connections}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: roleColor, textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)' }}>
                        {r.role}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
