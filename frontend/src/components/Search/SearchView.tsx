import { useState, useEffect, useRef } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import { search } from '../../api'
import type { SearchResult } from '../../types'
import { ResultCard } from './ResultCard'
import { Spinner } from '../ui/Spinner'
import { Pagination } from '../ui/Pagination'
import { EmptyState } from '../ui/EmptyState'

interface Props {
  onOpenThread: (docId: string) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
}

export function SearchView({ onOpenThread, searchInputRef }: Props) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const pageRef = useRef(page)
  pageRef.current = page

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery])

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      setTotal(0)
      return
    }
    let cancelled = false
    setLoading(true)
    search(debouncedQuery, pageRef.current, 20).then(data => {
      if (cancelled) return
      setResults(data.results)
      setTotal(data.total)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [debouncedQuery, page])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="page-enter" style={{ padding: '24px 32px', minHeight: '100%' }}>
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontFamily: 'var(--font-typewriter)',
            fontSize: '20px',
            color: 'var(--bone)',
            marginBottom: '4px',
          }}
        >
          QUERY DATABASE
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--bone-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          FULL-TEXT SEARCH // 7,545 THREADS // 15,188 MESSAGES
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--evidence-yellow-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '4px',
          }}
        >
          SEARCH QUERY
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Enter search terms..."
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '14px',
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--bone)',
          }}
          autoFocus
        />
      </div>

      {debouncedQuery.trim() && !loading && total > 0 && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--bone-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '12px',
          }}
        >
          RESULTS: {total.toLocaleString()} RECORDS MATCHED // PAGE {page} OF {totalPages}
        </div>
      )}

      {loading && <Spinner />}

      {!loading && results.length > 0 && (
        <div className="stagger-children">
          {results.map((r, i) => (
            <ResultCard
              key={r.message_id}
              result={r}
              index={(page - 1) * 20 + i}
              onClick={() => onOpenThread(r.doc_id)}
            />
          ))}
        </div>
      )}

      {!loading && debouncedQuery.trim() && results.length === 0 && (
        <EmptyState message="NO MATCHING RECORDS" />
      )}

      {!loading && results.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage(p => Math.max(1, p - 1))}
          onNext={() => setPage(p => Math.min(totalPages, p + 1))}
        />
      )}
    </div>
  )
}
