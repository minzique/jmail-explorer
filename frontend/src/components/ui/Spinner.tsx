export function Spinner() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        gap: '12px',
      }}
    >
      <div
        style={{
          width: '16px',
          height: '16px',
          border: '2px solid var(--border)',
          borderTopColor: 'var(--evidence-yellow)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--bone-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Accessing records...
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
