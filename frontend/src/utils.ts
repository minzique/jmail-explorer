const COLORS = [
  '#8b0000', '#6b3a2a', '#4a5a3a', '#5a4a3a', '#3a4a5a',
  '#6a4a5a', '#5a3a2a', '#3a5a4a', '#7a5a3a', '#4a3a5a',
]

export function avatarColor(s: string): string {
  let h = 0
  for (let i = 0; i < (s || '').length; i++) {
    h = s.charCodeAt(i) + ((h << 5) - h)
  }
  return COLORS[Math.abs(h) % COLORS.length]
}

export function initials(name: string): string {
  if (!name) return '?'
  const p = name.split(/[\s@.]+/).filter(Boolean)
  return p.length >= 2
    ? (p[0][0] + p[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '\u2014'
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return d
  }
}

export function escHtml(s: string): string {
  const d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}

export function exhibitId(index: number): string {
  return `A-${String(index + 1).padStart(3, '0')}`
}
