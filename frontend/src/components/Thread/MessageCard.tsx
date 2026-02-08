import { useEffect, useRef, useCallback } from 'react'
import type { Message } from '../../types'
import { avatarColor, initials, fmtDate } from '../../utils'
import { ClassifiedBadge } from '../ui/ClassifiedBadge'

interface Props {
  message: Message
}

export function MessageCard({ message }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const color = avatarColor(message.sender_email)
  const ini = initials(message.sender_name)
  const toRecipients = message.recipients.filter(r => r.type === 'to')
  const ccRecipients = message.recipients.filter(r => r.type === 'cc')

  const resizeIframe = useCallback(() => {
    const f = iframeRef.current
    if (!f) return
    try {
      const h = f.contentDocument?.body?.scrollHeight || 200
      f.style.height = Math.min(Math.max(h + 20, 80), 600) + 'px'
    } catch { /* cross-origin */ }
  }, [])

  useEffect(() => {
    const f = iframeRef.current
    if (!f || !message.content_html || message.content_html.trim().length <= 20) return

    const timer = setTimeout(() => {
      try {
        const doc = f.contentDocument || f.contentWindow?.document
        if (!doc) return
        doc.open()
        doc.write(
          `<style>body{font-family:'Crimson Pro','Georgia',serif;font-size:14px;color:#c8b89a;background:#0f0e0c;padding:12px;margin:0;word-break:break-word;line-height:1.6}a{color:#c4a000}img{max-width:100%;height:auto}</style>` +
          message.content_html
        )
        doc.close()
        setTimeout(resizeIframe, 150)
      } catch { /* */ }
    }, 0)
    return () => clearTimeout(timer)
  }, [message.content_html, resizeIframe])

  const hasHtml = message.content_html && message.content_html.trim().length > 20

  return (
    <div
      style={{
        background: 'var(--bg-paper)',
        border: '1px solid var(--border-subtle)',
        borderTop: message.is_from_epstein ? '2px solid var(--blood)' : '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        marginBottom: '10px',
      }}
    >
      {message.is_from_epstein && (
        <div
          style={{
            fontFamily: 'var(--font-typewriter)',
            fontSize: '10px',
            color: 'var(--blood-bright)',
            letterSpacing: '0.08em',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          ⚠ FROM: JEFFREY EPSTEIN
          <ClassifiedBadge label="SUBJECT" />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            opacity: 0.8,
          }}
        >
          {ini}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '12px' }}>
            {message.sender_name || 'Unknown'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--bone-muted)' }}>
            {message.sender_email}
          </div>
        </div>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--evidence-yellow-dim)',
            flexShrink: 0,
          }}
        >
          {fmtDate(message.sent_at)}
        </span>
        {message.attachment_count > 0 && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--evidence-yellow)',
              background: 'var(--bg-elevated)',
              padding: '1px 6px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          >
            📎 {message.attachment_count}
          </span>
        )}
      </div>

      {toRecipients.length > 0 && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--bone-muted)', marginBottom: '4px' }}>
          <span style={{ color: 'var(--evidence-yellow-dim)', fontFamily: 'var(--font-typewriter)' }}>TO: </span>
          <span style={{ color: 'var(--bone-dim)' }}>
            {toRecipients.map(r => r.name || r.address).join(', ')}
          </span>
        </div>
      )}

      {ccRecipients.length > 0 && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--bone-muted)', marginBottom: '4px' }}>
          <span style={{ color: 'var(--evidence-yellow-dim)', fontFamily: 'var(--font-typewriter)' }}>CC: </span>
          <span style={{ color: 'var(--bone-dim)' }}>
            {ccRecipients.map(r => r.name || r.address).join(', ')}
          </span>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        {hasHtml ? (
          <iframe
            ref={iframeRef}
            sandbox="allow-same-origin"
            style={{
              width: '100%',
              border: 'none',
              borderRadius: 'var(--radius)',
              minHeight: '100px',
              background: 'var(--bg-paper)',
            }}
          />
        ) : message.content_markdown ? (
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '14px',
              lineHeight: 1.7,
              color: 'var(--bone-dim)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {message.content_markdown}
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--bone-muted)' }}>
            (no content)
          </div>
        )}
      </div>
    </div>
  )
}
