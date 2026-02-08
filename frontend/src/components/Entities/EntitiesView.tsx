import { useState, useEffect } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import { getEntities } from '../../api'
import type { Entity } from '../../types'
import { EntityDetail } from './EntityDetail'
import { ClassifiedBadge } from '../ui/ClassifiedBadge'
import { Spinner } from '../ui/Spinner'
import { Pagination } from '../ui/Pagination'
import { EmptyState } from '../ui/EmptyState'

interface Props {
  onOpenThread: (docId: string) => void
  onViewNetwork: (email: string) => void
}

type SortField = 'name' | 'email' | 'message_count'

export function EntitiesView({ onOpenThread, onViewNetwork }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<SortField>('message_count')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [entities, setEntities] = useState<Entity[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const debouncedSearch = useDebounce(searchQuery, 300)

  useEffect(() => { setPage(1) }, [debouncedSearch])

  useEffect(() => {
    setLoading(true)
    getEntities(page, 50, sort, order, debouncedSearch)
      .then(data => { setEntities(data.entities); setTotal(data.total); setLoading(false) })
      .catch(() => setLoading(false))
  }, [page, sort, order, debouncedSearch])

  const totalPages = Math.ceil(total / 50)

  const handleSort = (field: SortField) => {
    if (sort === field) {
      setOrder(o => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(field)
      setOrder(field === 'message_count' ? 'desc' : 'asc')
    }
    setPage(1)
  }

  const arrow = order === 'asc' ? '↑' : '↓'

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 14px',
    fontFamily: 'var(--font-typewriter)',
    fontSize: '10px',
    color: 'var(--bone-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    userSelect: 'none',
  }

  return (
    <div className="page-enter" style={{ padding: '24px 32px', minHeight: '100%' }}>
      <div
        style={{
          fontFamily: 'var(--font-typewriter)',
          fontSize: '20px',
          color: 'var(--bone)',
          marginBottom: '4px',
        }}
      >
        SUBJECT FILES
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--bone-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '16px',
        }}
      >
        KNOWN ENTITIES IN ARCHIVE
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--evidence-yellow-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
          FILTER SUBJECTS
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Name or email..."
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '10px 14px',
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--bone)',
          }}
        />
      </div>

      {loading && <Spinner />}

      {!loading && entities.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle} onClick={() => handleSort('name')}>
                  Name {sort === 'name' && <span>{arrow}</span>}
                </th>
                <th style={thStyle} onClick={() => handleSort('email')}>
                  Email {sort === 'email' && <span>{arrow}</span>}
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('message_count')}>
                  Messages {sort === 'message_count' && <span>{arrow}</span>}
                </th>
                <th style={thStyle}>Type</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((e, i) => (
                <tr
                  key={e.email}
                  onClick={() => setSelectedEmail(e.email)}
                  style={{
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                    borderLeft: e.is_epstein ? '3px solid var(--blood)' : '3px solid transparent',
                    background: i % 2 === 0 ? 'transparent' : 'var(--bg-surface)',
                  }}
                  onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = 'var(--bg-manila)'}
                  onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'transparent' : 'var(--bg-surface)'}
                >
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                    {e.name || '\u2014'}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--bone-dim)', borderBottom: '1px solid var(--border-subtle)' }}>
                    {e.email}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-subtle)' }}>
                    {e.message_count}
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                    {e.is_epstein > 0 && <ClassifiedBadge />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && entities.length === 0 && <EmptyState />}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
      />

      {selectedEmail && (
        <EntityDetail
          email={selectedEmail}
          onOpenThread={onOpenThread}
          onViewNetwork={onViewNetwork}
          onNavigate={setSelectedEmail}
        />
      )}
    </div>
  )
}
