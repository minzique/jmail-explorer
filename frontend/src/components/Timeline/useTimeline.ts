import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import type { TimelineEntry } from '../../types'

interface Options {
  onBarClick?: (month: string) => void
}

export function useTimeline(
  containerRef: React.RefObject<HTMLDivElement | null>,
  svgRef: React.RefObject<SVGSVGElement | null>,
  data: TimelineEntry[],
  options: Options = {}
) {
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const container = containerRef.current
    const margin = { top: 20, right: 20, bottom: 60, left: 50 }
    const w = container.clientWidth - margin.left - margin.right
    const h = 380 - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scaleBand().domain(data.map(d => d.month)).range([0, w]).padding(0.2)
    const y = d3.scaleLinear().domain([0, (d3.max(data, d => d.message_count) || 0) * 1.1]).range([h, 0])

    g.selectAll('.ruled-line').data(y.ticks(6)).join('line')
      .attr('class', 'ruled-line')
      .attr('x1', 0).attr('x2', w)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', 'var(--border-subtle)')
      .attr('stroke-dasharray', '2,4')

    g.append('g').attr('transform', `translate(0,${h})`).call(
      d3.axisBottom(x).tickValues(x.domain().filter((_: string, i: number) => i % 12 === 0))
    )
      .selectAll('text')
      .attr('fill', '#5a5347')
      .attr('font-size', 9)
      .attr('font-family', "'Special Elite', cursive")
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')

    g.append('g').call(d3.axisLeft(y).ticks(6))
      .selectAll('text')
      .attr('fill', '#5a5347')
      .attr('font-size', 9)
      .attr('font-family', "'IBM Plex Mono', monospace")

    g.selectAll('.domain,.tick line').attr('stroke', '#2a2520')

    const tooltip = tooltipRef.current

    g.selectAll('.bar').data(data).join('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.month) || 0)
      .attr('y', d => y(d.message_count))
      .attr('width', x.bandwidth())
      .attr('height', d => h - y(d.message_count))
      .attr('rx', 1)
      .attr('fill', '#8b0000')
      .attr('opacity', 0.8)
      .attr('cursor', 'pointer')
      .on('mouseover', function (_, d) {
        d3.select(this).attr('fill', '#cc1100').attr('opacity', 1)
        if (tooltip) {
          tooltip.style.display = 'block'
          tooltip.innerHTML = `<span style="font-family:var(--font-typewriter);font-size:9px;color:var(--stamp-red);letter-spacing:0.08em">${d.month}</span><br><span style="font-family:var(--font-mono);font-size:12px;color:var(--bone)">${d.message_count} MESSAGES</span>`
        }
      })
      .on('mousemove', function (event) {
        if (tooltip) {
          tooltip.style.left = (event.offsetX + 12) + 'px'
          tooltip.style.top = (event.offsetY - 40) + 'px'
        }
      })
      .on('mouseout', function () {
        d3.select(this).attr('fill', '#8b0000').attr('opacity', 0.8)
        if (tooltip) tooltip.style.display = 'none'
      })
      .on('click', (_, d) => {
        options.onBarClick?.(d.month)
      })
  }, [data, svgRef, containerRef, options])

  return { tooltipRef }
}
