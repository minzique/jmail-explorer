interface Props {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

const btnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '6px 14px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--bg-surface)',
  color: 'var(--bone-dim)',
  cursor: 'pointer',
  transition: 'all 0.15s',
}

const btnDisabled: React.CSSProperties = {
  ...btnStyle,
  opacity: 0.3,
  cursor: 'default',
}

export function Pagination({ page, totalPages, onPrev, onNext }: Props) {
  if (totalPages <= 1) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        marginTop: '20px',
        paddingBottom: '20px',
      }}
    >
      <button
        style={page <= 1 ? btnDisabled : btnStyle}
        disabled={page <= 1}
        onClick={onPrev}
        onMouseEnter={e => { if (page > 1) (e.target as HTMLElement).style.borderColor = 'var(--evidence-yellow)' }}
        onMouseLeave={e => (e.target as HTMLElement).style.borderColor = 'var(--border)'}
      >
        ◀ Prev
      </button>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--bone-muted)',
        }}
      >
        {page} / {totalPages}
      </span>
      <button
        style={page >= totalPages ? btnDisabled : btnStyle}
        disabled={page >= totalPages}
        onClick={onNext}
        onMouseEnter={e => { if (page < totalPages) (e.target as HTMLElement).style.borderColor = 'var(--evidence-yellow)' }}
        onMouseLeave={e => (e.target as HTMLElement).style.borderColor = 'var(--border)'}
      >
        Next ▶
      </button>
    </div>
  )
}
