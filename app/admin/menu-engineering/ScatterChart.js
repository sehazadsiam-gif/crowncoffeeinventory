'use client'
import { useMemo } from 'react'
import { CLASSIFICATION_COLORS } from '../../../lib/costing-calculations'

const PAD = { top: 40, right: 30, bottom: 50, left: 70 }
const W = 560, H = 400
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top  - PAD.bottom

/**
 * SVG 2×2 scatter chart for menu engineering.
 * items: [{id, name, cm, popularity, classification}]
 * medianCM, medianPop: median values for quadrant lines
 */
export default function ScatterChart({ items, medianCM, medianPop }) {
  const { xMin, xMax, yMin, yMax, toX, toY } = useMemo(() => {
    if (!items.length) return { xMin:0,xMax:100,yMin:0,yMax:100, toX:()=>0, toY:()=>0 }
    const pops = items.map(i => i.popularity)
    const cms  = items.map(i => i.cm)
    const xMin = 0
    const xMax = Math.max(...pops) * 1.15 || 100
    const yMin = Math.min(0, Math.min(...cms) * 1.1)
    const yMax = Math.max(...cms) * 1.15 || 100
    const toX = v => PAD.left + ((v - xMin) / (xMax - xMin)) * PLOT_W
    const toY = v => PAD.top  + ((yMax - v) / (yMax - yMin)) * PLOT_H
    return { xMin, xMax, yMin, yMax, toX, toY }
  }, [items])

  if (!items.length) {
    return (
      <div style={styles.empty}>
        No items to display. Enter sales data first.
      </div>
    )
  }

  const qLineX = toX(medianPop)
  const qLineY = toY(medianCM)

  // Quadrant label positions
  const quadrants = [
    { label: 'High Profit\nHigh Sale',  x: (qLineX + PAD.left + PLOT_W) / 2, y: (PAD.top + qLineY) / 2, color: '#10B981' },
    { label: 'Low Profit\nHigh Sale',   x: (PAD.left + qLineX) / 2,           y: (PAD.top + qLineY) / 2, color: '#F59E0B' },
    { label: 'High Profit\nLow Sale',   x: (qLineX + PAD.left + PLOT_W) / 2, y: (qLineY + PAD.top + PLOT_H) / 2, color: '#3B82F6' },
    { label: 'Low Profit\nLow Sale',    x: (PAD.left + qLineX) / 2,           y: (qLineY + PAD.top + PLOT_H) / 2, color: '#EF4444' },
  ]

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, fontFamily: 'var(--font-sans)' }}>
        {/* Background quadrants (subtle tint) */}
        <rect x={qLineX} y={PAD.top}   width={PAD.left+PLOT_W-qLineX} height={qLineY-PAD.top}    fill="#10B98108" />
        <rect x={PAD.left} y={PAD.top} width={qLineX-PAD.left}        height={qLineY-PAD.top}    fill="#F59E0B08" />
        <rect x={qLineX} y={qLineY}    width={PAD.left+PLOT_W-qLineX} height={PAD.top+PLOT_H-qLineY} fill="#3B82F608" />
        <rect x={PAD.left} y={qLineY}  width={qLineX-PAD.left}        height={PAD.top+PLOT_H-qLineY} fill="#EF444408" />

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top+PLOT_H} stroke="var(--border-medium)" strokeWidth={1.5} />
        <line x1={PAD.left} y1={PAD.top+PLOT_H} x2={PAD.left+PLOT_W} y2={PAD.top+PLOT_H} stroke="var(--border-medium)" strokeWidth={1.5} />

        {/* Median lines */}
        <line x1={qLineX} y1={PAD.top} x2={qLineX} y2={PAD.top+PLOT_H}
              stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="5,4" />
        <line x1={PAD.left} y1={qLineY} x2={PAD.left+PLOT_W} y2={qLineY}
              stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="5,4" />

        {/* Axis labels */}
        <text x={PAD.left + PLOT_W/2} y={H - 6} textAnchor="middle" fontSize={12} fill="var(--text-muted)">
          Popularity %
        </text>
        <text x={18} y={PAD.top + PLOT_H/2} textAnchor="middle" fontSize={12} fill="var(--text-muted)"
              transform={`rotate(-90, 18, ${PAD.top + PLOT_H/2})`}>
          Contrib. Margin (৳)
        </text>

        {/* Y axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const val = yMin + t * (yMax - yMin)
          const y   = toY(val)
          return (
            <g key={t}>
              <line x1={PAD.left-4} y1={y} x2={PAD.left} y2={y} stroke="var(--border-medium)" strokeWidth={1}/>
              <text x={PAD.left-8} y={y+4} textAnchor="end" fontSize={10} fill="var(--text-muted)">
                {val >= 1000 ? (val/1000).toFixed(1)+'k' : Math.round(val)}
              </text>
            </g>
          )
        })}

        {/* X axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const val = xMin + t * (xMax - xMin)
          const x   = toX(val)
          return (
            <g key={t}>
              <line x1={x} y1={PAD.top+PLOT_H} x2={x} y2={PAD.top+PLOT_H+4} stroke="var(--border-medium)" strokeWidth={1}/>
              <text x={x} y={PAD.top+PLOT_H+16} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
                {val.toFixed(1)}%
              </text>
            </g>
          )
        })}

        {/* Quadrant labels */}
        {quadrants.map((q, i) => q.label.split('\n').map((line, li) => (
          <text key={`${i}-${li}`} x={q.x} y={q.y + li * 14 - 6}
                textAnchor="middle" fontSize={10} fill={q.color}
                fontWeight={600} opacity={0.7}>
            {line}
          </text>
        )))}

        {/* Data points */}
        {items.map(item => {
          const cx = toX(item.popularity)
          const cy = toY(item.cm)
          const color = CLASSIFICATION_COLORS[item.classification] || '#6B7280'
          return (
            <g key={item.id}>
              <circle cx={cx} cy={cy} r={7} fill={color} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
              <text x={cx} y={cy - 11} textAnchor="middle" fontSize={10} fill="var(--text-primary)" fontWeight={500}>
                {item.name.length > 14 ? item.name.slice(0, 13) + '…' : item.name}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(CLASSIFICATION_COLORS).map(([label, color]) => (
          <div key={label} style={styles.legendItem}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  empty: { textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 14 },
  legend: { display: 'flex', flexWrap: 'wrap', gap: '8px 20px', marginTop: 12 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' },
}
