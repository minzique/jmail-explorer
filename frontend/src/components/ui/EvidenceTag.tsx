interface Props {
  id: string
}

export function EvidenceTag({ id }: Props) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--bone-muted)',
        border: '1px solid var(--border)',
        padding: '1px 5px',
        borderRadius: 'var(--radius)',
        whiteSpace: 'nowrap',
      }}
    >
      {id}
    </span>
  )
}
