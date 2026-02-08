interface Props {
  label?: string
}

export function ClassifiedBadge({ label = 'EPSTEIN' }: Props) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-typewriter)',
        fontSize: '10px',
        letterSpacing: '0.08em',
        background: 'var(--blood-glow)',
        color: 'var(--blood-bright)',
        padding: '2px 8px',
        border: '1px solid var(--blood)',
        borderRadius: 'var(--radius)',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  )
}
