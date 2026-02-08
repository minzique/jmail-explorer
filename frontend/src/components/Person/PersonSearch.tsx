import { useState, useEffect, useRef } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import { getEntities } from '../../api'
import type { Entity } from '../../types'

interface PersonSearchProps {
  onSelectPerson: (email: string) => void
}

export function PersonSearch({ onSelectPerson }: PersonSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Entity[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  
  const debouncedQuery = useDebounce(query, 300)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.length < 2) {
        setResults([])
        return
      }

      try {
        const response = await getEntities(1, 10, 'message_count', 'desc', debouncedQuery)
        setResults(response.entities)
        setIsOpen(true)
      } catch (error) {
        console.error('Failed to search entities:', error)
        setResults([])
      }
    }

    fetchResults()
  }, [debouncedQuery])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSelect = (email: string) => {
    onSelectPerson(email)
    setQuery('')
    setIsOpen(false)
  }

  return (
    <div 
      className="page-enter"
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '40px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <div style={{ width: '100%', position: 'relative' }} ref={wrapperRef}>
        <h2 style={{
          fontFamily: 'var(--font-typewriter)',
          fontSize: '20px',
          color: 'var(--bone)',
          marginBottom: '4px',
          textAlign: 'center',
          fontWeight: 'normal'
        }}>
          PERSON DOSSIER
        </h2>
        
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--bone-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          SEARCH ENTITY DATABASE
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name or email..."
          onFocus={() => {
            setIsFocused(true)
            if (query.length >= 2) setIsOpen(true)
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false)
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '14px',
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-surface)',
            border: `1px solid ${isFocused ? 'var(--evidence-yellow)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            color: 'var(--bone)',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s'
          }}
        />
        
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--bone-muted)',
          marginTop: '8px',
          textAlign: 'center'
        }}>
          ⌕ Enter name or email to search entity database
        </div>

        {isOpen && query.length >= 2 && (
          <div style={{
            marginTop: '4px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            maxHeight: '400px',
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            width: '100%'
          }}>
            {results.length > 0 ? (
              results.map((entity) => (
                <div
                  key={entity.id}
                  onClick={() => handleSelect(entity.email)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-manila)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: entity.is_epstein ? 'var(--blood)' : 'var(--bone-muted)',
                    flexShrink: 0
                  }} />
                  
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--bone)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {entity.name || entity.email}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--bone-dim)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {entity.email}
                    </div>
                  </div>

                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--evidence-yellow)',
                    flexShrink: 0
                  }}>
                    {entity.message_count.toLocaleString()} msgs
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                fontFamily: 'var(--font-typewriter)',
                fontSize: '11px',
                color: 'var(--bone-muted)'
              }}>
                NO SUBJECTS FOUND
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
