import { useState, useEffect } from 'react'
import { getStats } from '../../api'
import type { Stats } from '../../types'
import { Spinner } from '../ui/Spinner'
import { fmtDate } from '../../utils'

export function StatsView() {
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
      </div>
    </div>
  )
}
