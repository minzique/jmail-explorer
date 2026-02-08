import { useState, useRef, useEffect, useCallback } from 'react'
import type { ViewName } from './types'
import { Shell } from './components/Layout/Shell'
import { Sidebar } from './components/Layout/Sidebar'
import { SearchView } from './components/Search/SearchView'
import { NetworkView } from './components/Network/NetworkView'
import { EntitiesView } from './components/Entities/EntitiesView'
import { TimelineView } from './components/Timeline/TimelineView'
import { StatsView } from './components/Stats/StatsView'
import { PersonView } from './components/Person/PersonView'
import { ThreadOverlay } from './components/Thread/ThreadOverlay'

export default function App() {
  const [view, setView] = useState<ViewName>('search')
  const [threadId, setThreadId] = useState<string | null>(null)
  const [egoEmail, setEgoEmail] = useState<string | null>(null)
  const [personEmail, setPersonEmail] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const openThread = useCallback((docId: string) => setThreadId(docId), [])
  const closeThread = useCallback(() => setThreadId(null), [])

  const handleViewPerson = useCallback((email: string) => {
    setPersonEmail(email)
    setView('person')
  }, [])

  const handleViewEntity = useCallback((_email: string) => {
    setView('entities')
  }, [])

  const handleViewNetwork = useCallback((email: string) => {
    setEgoEmail(email)
    setView('network')
  }, [])

  const handleSearchMonth = useCallback((month: string) => {
    setView('search')
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.value = month
        searchInputRef.current.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }, 100)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setView('search')
        searchInputRef.current?.focus()
      }
      if (e.key === '/' && (document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault()
        setView('search')
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleViewChange = useCallback((v: ViewName) => {
    if (v !== 'network') setEgoEmail(null)
    if (v !== 'person') setPersonEmail(null)
    setView(v)
  }, [])

  return (
    <Shell>
      <Sidebar activeView={view} onViewChange={handleViewChange} />
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {view === 'search' && (
          <SearchView onOpenThread={openThread} searchInputRef={searchInputRef} />
        )}
        {view === 'network' && (
          <NetworkView onViewEntity={handleViewEntity} onViewPerson={handleViewPerson} egoEmail={egoEmail} />
        )}
        {view === 'entities' && (
          <EntitiesView onOpenThread={openThread} onViewNetwork={handleViewNetwork} onViewPerson={handleViewPerson} />
        )}
        {view === 'person' && (
          <PersonView email={personEmail} onOpenThread={openThread} onViewNetwork={handleViewNetwork} onViewPerson={handleViewPerson} />
        )}
        {view === 'timeline' && (
          <TimelineView onSearchMonth={handleSearchMonth} />
        )}
        {view === 'stats' && <StatsView onViewPerson={handleViewPerson} />}
      </main>

      {threadId && <ThreadOverlay docId={threadId} onClose={closeThread} />}
    </Shell>
  )
}
