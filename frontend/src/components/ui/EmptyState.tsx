interface Props {
  message?: string
}

export function EmptyState({ message = 'NO RECORDS FOUND' }: Props) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '80px 20px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-typewriter)',
          fontSize: '16px',
          color: 'var(--bone-muted)',
          letterSpacing: '0.08em',
          marginBottom: '8px',
        }}
      >
        {message}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--border)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        End of file
      </div>
    </div>
  )
}
