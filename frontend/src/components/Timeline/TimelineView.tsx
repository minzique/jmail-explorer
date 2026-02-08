import { useState, useEffect, useRef } from 'react'
import { getTimeline } from '../../api'
import type { TimelineEntry } from '../../types'
import { useTimeline } from './useTimeline'
import { Spinner } from '../ui/Spinner'

interface Props {
  onSearchMonth: (month: string) => void
}

export function TimelineView({ onSearchMonth }: Props) {
  const [data, setData] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    getTimeline()
      .then(d => { setData(d.timeline); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const { tooltipRef } = useTimeline(containerRef, svgRef, data, {
    onBarClick: onSearchMonth,
  })

  useEffect(() => {
    const handleResize = () => {
      if (data.length && containerRef.current && svgRef.current) {
        const svg = svgRef.current
        svg.innerHTML = ''
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [data])

  return (
    <div className="page-enter" style={{ padding: '24px 32px', minHeight: '100%' }}>
      <div
        style={{
          fontFamily: 'var(--font-typewriter)',
          fontSize: '20px',
          color: 'var(--bone)',
          marginBottom: '4px',
        }}
      >
        TEMPORAL ANALYSIS
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--bone-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '20px',
        }}
      >
        MESSAGE VOLUME BY MONTH ACROSS THE ARCHIVE
      </div>

      {loading && <Spinner />}

      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '400px',
          position: 'relative',
        }}
      >
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '8px 12px',
            display: 'none',
            zIndex: 5,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        />
        <svg ref={svgRef} width="100%" height="100%" />
      </div>
    </div>
  )
}
