import { useState, useRef, useEffect, useCallback } from 'react'
import { getGraph, getEgoGraph } from '../../api'
import type { GraphData } from '../../types'
import { useForceGraph } from './useForceGraph'
import { Spinner } from '../ui/Spinner'

interface Props {
  onViewEntity: (email: string) => void
  egoEmail?: string | null
}

export function NetworkView({ onViewEntity, egoEmail }: Props) {
  const [minWeight, setMinWeight] = useState(10)
  const [maxNodes, setMaxNodes] = useState(100)
  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const loadGraph = useCallback(async () => {
    setLoading(true)
    try {
      const result = egoEmail
        ? await getEgoGraph(egoEmail)
        : await getGraph(minWeight, maxNodes)
      setData(result)
    } catch { /* */ }
    setLoading(false)
  }, [minWeight, maxNodes, egoEmail])

  useEffect(() => { loadGraph() }, [loadGraph])

  useForceGraph(containerRef, svgRef, data, { onNodeClick: onViewEntity })

  useEffect(() => {
    const handleResize = () => { if (data) loadGraph() }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [data, loadGraph])

  return (
    <div
      ref={containerRef}
      className="surveillance-grid"
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 0px)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 5,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '16px',
          minWidth: '200px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-typewriter)',
            fontSize: '10px',
            color: 'var(--stamp-red)',
            letterSpacing: '0.08em',
            marginBottom: '12px',
          }}
        >
          SURVEILLANCE CONTROLS
        </div>

        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--bone-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '2px',
          }}
        >
          MIN EDGE WEIGHT: <span style={{ color: 'var(--evidence-yellow)' }}>{minWeight}</span>
        </label>
        <input
          type="range"
          min={1}
          max={100}
          value={minWeight}
          onChange={e => setMinWeight(+e.target.value)}
          style={{
            width: '100%',
            marginBottom: '10px',
            accentColor: 'var(--blood)',
          }}
        />

        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--bone-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '2px',
          }}
        >
          MAX SUBJECTS: <span style={{ color: 'var(--evidence-yellow)' }}>{maxNodes}</span>
        </label>
        <input
          type="range"
          min={20}
          max={300}
          value={maxNodes}
          onChange={e => setMaxNodes(+e.target.value)}
          style={{
            width: '100%',
            marginBottom: '10px',
            accentColor: 'var(--blood)',
          }}
        />

        <button
          onClick={loadGraph}
          style={{
            fontFamily: 'var(--font-typewriter)',
            fontSize: '10px',
            color: 'var(--evidence-yellow)',
            letterSpacing: '0.06em',
            padding: '4px 10px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--bg-paper)',
            cursor: 'pointer',
          }}
        >
          RELOAD SCAN
        </button>
      </div>

      <div
        id="graph-tooltip"
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          fontSize: '12px',
          zIndex: 10,
          display: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}
      />

      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner />
        </div>
      )}

      <svg ref={svgRef} width="100%" height="100%" />
    </div>
  )
}
