import { useEffect, useState } from 'react'
import { getThread } from '../../api'
import type { Thread, Message } from '../../types'
import { ThreadHeader } from './ThreadHeader'
import { MessageCard } from './MessageCard'
import { Spinner } from '../ui/Spinner'

interface Props {
  docId: string
  onClose: () => void
}

export function ThreadOverlay({ docId, onClose }: Props) {
  const [thread, setThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getThread(docId)
      .then(data => {
        setThread(data.thread)
        setMessages(data.messages)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [docId])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
        padding: '24px',
        backdropFilter: 'blur(4px)',
        animation: 'page-enter 0.15s ease',
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          width: '100%',
          maxWidth: '800px',
          overflowY: 'auto',
          animation: 'page-enter 0.2s ease',
        }}
      >
        {loading && <Spinner />}

        {!loading && thread && (
          <>
            <ThreadHeader thread={thread} onClose={onClose} />
            <div style={{ padding: '16px 24px' }}>
              {messages.map(m => (
                <MessageCard key={m.id} message={m} />
              ))}
            </div>
          </>
        )}

        {!loading && !thread && (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              fontFamily: 'var(--font-typewriter)',
              color: 'var(--bone-muted)',
            }}
          >
            FILE NOT FOUND
          </div>
        )}
      </div>
    </div>
  )
}
