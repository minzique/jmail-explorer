import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode, GraphLink } from '../../types'

interface Options {
  onNodeClick?: (email: string) => void
}

export function useForceGraph(
  containerRef: React.RefObject<HTMLDivElement | null>,
  svgRef: React.RefObject<SVGSVGElement | null>,
  data: GraphData | null,
  options: Options = {}
) {
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)

  const render = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !data || !data.nodes.length) return

    if (simulationRef.current) simulationRef.current.stop()

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const w = containerRef.current.clientWidth
    const h = containerRef.current.clientHeight

    svg.attr('viewBox', `0 0 ${w} ${h}`)

    const maxCount = d3.max(data.nodes, d => d.count) || 1
    const maxWeight = d3.max(data.links, d => d.weight) || 1
    const nodeScale = d3.scaleSqrt().domain([0, maxCount]).range([4, 22])
    const linkScale = d3.scaleLinear().domain([0, maxWeight]).range([0.3, 3])

    const g = svg.append('g')
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .on('zoom', e => g.attr('transform', e.transform))
    )

    const link = g.append('g').selectAll('line').data(data.links).join('line')
      .attr('stroke', 'rgba(200,184,154,0.12)')
      .attr('stroke-width', (d: GraphLink) => linkScale(d.weight))

    const node = g.append('g').selectAll<SVGGElement, GraphNode>('g').data(data.nodes).join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (e, d) => {
            if (!e.active) simulationRef.current?.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (e, d) => {
            d.fx = e.x
            d.fy = e.y
          })
          .on('end', (e, d) => {
            if (!e.active) simulationRef.current?.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    node.append('circle')
      .attr('r', d => nodeScale(d.count))
      .attr('fill', d => d.is_epstein ? '#8b0000' : '#6a6050')
      .attr('stroke', d => d.is_epstein ? '#cc1100' : '#8a7e6a')
      .attr('stroke-width', d => d.is_epstein ? 2 : 1)
      .attr('opacity', 0.85)

    node.filter(d => !!d.is_epstein).select('circle')
      .style('filter', 'drop-shadow(0 0 6px rgba(139,0,0,0.6))')

    node.append('text')
      .text(d => (d.name || d.email || '').slice(0, 14))
      .attr('font-size', 8)
      .attr('fill', '#5a5347')
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeScale(d.count) + 11)
      .attr('font-family', "'IBM Plex Mono', monospace")

    node.on('click', (_e, d) => {
      options.onNodeClick?.(d.email)
    })

    const tooltip = document.getElementById('graph-tooltip')
    node.on('mouseover', (_e, d) => {
      if (!tooltip) return
      tooltip.style.display = 'block'
      tooltip.innerHTML = `
        <div style="font-family:var(--font-typewriter);font-size:9px;color:var(--stamp-red);letter-spacing:0.08em;margin-bottom:4px">SUBJECT FILE</div>
        <div style="font-family:var(--font-mono);font-weight:600;font-size:12px;color:var(--bone)">${d.name || 'Unknown'}</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--bone-muted)">${d.email}</div>
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--evidence-yellow);margin-top:4px">${d.count} messages${d.is_epstein ? ' // EPSTEIN ACCOUNT' : ''}</div>
      `
    }).on('mousemove', (e) => {
      if (!tooltip) return
      tooltip.style.left = (e.offsetX + 14) + 'px'
      tooltip.style.top = (e.offsetY - 10) + 'px'
    }).on('mouseout', () => {
      if (tooltip) tooltip.style.display = 'none'
    })

    simulationRef.current = d3.forceSimulation<GraphNode>(data.nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(data.links).id(d => d.id).distance(80).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => nodeScale(d.count) + 4))
      .on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y)
        node.attr('transform', d => `translate(${d.x},${d.y})`)
      })
  }, [data, svgRef, containerRef, options])

  useEffect(() => {
    render()
    return () => { simulationRef.current?.stop() }
  }, [render])

  return { render }
}
