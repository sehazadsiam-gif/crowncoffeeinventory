'use client'
import { useMemo } from 'react'

const PAD = { top: 30, right: 24, bottom: 50, left: 80 }
const W = 640, H = 280
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top  - PAD.bottom

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

/**
 * SVG line chart: Contribution Margin vs Fixed Costs over time.
 * data: [{year, month, totalCM, totalFixed}]
 */
export default function TrendChart({ data }) {
  const sorted = useMemo(() => [...(data || [])].sort((a,b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  ), [data])

  if (sorted.length < 2) {
    return (
      <div style={styles.empty}>
        Need at least 2 months of data for a trend chart.
      </div>
    )
  }

  const allVals = sorted.flatMap(d => [d.totalCM, d.totalFixed, 0])
  const yMin = 0
  const yMax = Math.max(...allVals) * 1.15 || 100

  const toX = i => PAD.left + (i / (sorted.length - 1)) * PLOT_W
  const toY = v => PAD.top  + ((yMax - v) / (yMax - yMin)) * PLOT_H

  function makePath(getValue) {
    return sorted.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(getValue(d))}`).join(' ')
  }

  const cmPath    = makePath(d => d.totalCM)
  const fixedPath = makePath(d => d.totalFixed)

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => yMin + t * (yMax - yMin))

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, fontFamily: 'var(--font-sans)' }}>
        {/* Grid lines */}
        {yTicks.map(v => (
          <line key={v} x1={PAD.left} y1={toY(v)} x2={PAD.left+PLOT_W} y2={toY(v)}
                stroke="var(--border-light)" strokeWidth={1} />
        ))}

        {/* CM area fill */}
        <path
          d={`${cmPath} L${toX(sorted.length-1)},${toY(0)} L${toX(0)},${toY(0)} Z`}
          fill="#10B981" fillOpacity={0.08}
        />

        {/* Lines */}
        <path d={cmPath}    stroke="#10B981" strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        <path d={fixedPath} stroke="#EF4444" strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeDasharray="6,3" />

        {/* Dots */}
        {sorted.map((d, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(d.totalCM)}    r={4} fill="#10B981" stroke="#fff" strokeWidth={1.5} />
            <circle cx={toX(i)} cy={toY(d.totalFixed)} r={4} fill="#EF4444" stroke="#fff" strokeWidth={1.5} />
          </g>
        ))}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top+PLOT_H} stroke="var(--border-medium)" strokeWidth={1.5}/>
        <line x1={PAD.left} y1={PAD.top+PLOT_H} x2={PAD.left+PLOT_W} y2={PAD.top+PLOT_H} stroke="var(--border-medium)" strokeWidth={1.5}/>

        {/* Y ticks */}
        {yTicks.map(v => (
          <g key={v}>
            <text x={PAD.left-8} y={toY(v)+4} textAnchor="end" fontSize={10} fill="var(--text-muted)">
              {v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'k' : Math.round(v)}
            </text>
          </g>
        ))}

        {/* X labels */}
        {sorted.map((d, i) => (
          <text key={i} x={toX(i)} y={PAD.top+PLOT_H+16} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
            {MONTH_NAMES[d.month-1]} {d.year !== sorted[0].year ? `'${String(d.year).slice(-2)}` : ''}
          </text>
        ))}

        {/* Y axis label */}
        <text x={14} y={PAD.top+PLOT_H/2} textAnchor="middle" fontSize={10} fill="var(--text-muted)"
              transform={`rotate(-90,14,${PAD.top+PLOT_H/2})`}>৳</text>
      </svg>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ width: 24, height: 3, background: '#10B981', borderRadius: 2 }} />
          <span>Total Contribution Margin</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ width: 24, height: 3, background: '#EF4444', borderRadius: 2, backgroundImage: 'repeating-linear-gradient(to right, #EF4444 0, #EF4444 6px, transparent 6px, transparent 9px)' }} />
          <span>Fixed Costs</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  empty:      { textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 14 },
  legend:     { display: 'flex', gap: 24, marginTop: 12 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' },
}
