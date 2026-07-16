'use client'
import { useState, useEffect } from 'react'
import { computeProfitability, formatBDT, formatPct } from '../../../lib/costing-calculations'
import TrendChart from './TrendChart'
import { Save, Download, TrendingUp, TrendingDown } from 'lucide-react'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function SectionC({ year, month, totalCM, totalRevenue, onExport }) {
  const [costs, setCosts]       = useState({ rent: '', salaries: '', utilities: '', other_overhead: '', notes: '' })
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [trendData, setTrendData] = useState([])

  // Load existing fixed costs
  useEffect(() => {
    fetch(`/api/admin/fixed-costs?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data[0]) {
          const d = data[0]
          setCosts({ rent: d.rent||'', salaries: d.salaries||'', utilities: d.utilities||'', other_overhead: d.other_overhead||'', notes: d.notes||'' })
        }
      })
      .catch(() => {})
  }, [year, month])

  // Load trend data (last 12 months)
  useEffect(() => {
    const fromYear = month <= 6 ? year - 1 : year
    const fromMonth = month <= 6 ? month + 6 : month - 6
    fetch(`/api/admin/fixed-costs?fromYear=${fromYear}&fromMonth=${fromMonth}&toYear=${year}&toMonth=${month}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          // For trend, we need totalCM per month — approximated with just fixed costs here
          // In a full build you'd JOIN sales_monthly; for now we show fixed costs trend
          setTrendData(data.map(d => ({
            year: d.year, month: d.month,
            totalFixed: (d.rent||0)+(d.salaries||0)+(d.utilities||0)+(d.other_overhead||0),
            totalCM: 0, // would need to join sales data per month
          })))
        }
      })
      .catch(() => {})
  }, [year, month])

  const totalFixed = (['rent','salaries','utilities','other_overhead'])
    .reduce((s, k) => s + (parseFloat(costs[k]) || 0), 0)

  const metrics = computeProfitability(totalCM || 0, totalRevenue || 0, {
    rent:          parseFloat(costs.rent) || 0,
    salaries:      parseFloat(costs.salaries) || 0,
    utilities:     parseFloat(costs.utilities) || 0,
    other_overhead: parseFloat(costs.other_overhead) || 0,
  })

  const profit    = metrics.netProfitLoss
  const isProfit  = profit >= 0
  const cmRatio   = metrics.cmRatio
  const beRev     = metrics.breakEvenRev
  const beUnits   = beRev && totalRevenue && (totalCM + totalFixed) > 0
    ? beRev / (totalRevenue / ((totalCM + totalFixed) > 0 ? 1 : 1))  // avg sp approximation
    : null

  async function saveCosts() {
    setSaving(true)
    await fetch('/api/admin/fixed-costs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, ...costs }),
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <div style={styles.secHeader}>
        <div>
          <h2 style={styles.secTitle}>Business Profitability</h2>
          <p style={styles.secSub}>{MONTH_NAMES[month-1]} {year} · Monthly P&amp;L</p>
        </div>
        <button onClick={() => onExport('C')} style={styles.outlineBtn}>
          <Download size={13} /> Export
        </button>
      </div>

      {/* NET PROFIT/LOSS — prominent */}
      <div style={{ ...styles.profitBanner, background: isProfit ? 'var(--success-bg)' : 'var(--danger-bg)', borderColor: isProfit ? 'var(--success)' : 'var(--danger)' }}>
        {isProfit ? <TrendingUp size={28} color="var(--success)" /> : <TrendingDown size={28} color="var(--danger)" />}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Net {isProfit ? 'Profit' : 'Loss'} — {MONTH_NAMES[month-1]} {year}
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: isProfit ? 'var(--success)' : 'var(--danger)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {formatBDT(Math.abs(profit))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Total CM {formatBDT(totalCM)} − Fixed Costs {formatBDT(totalFixed)}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Total Contribution Margin</div>
          <div style={styles.metricValue}>{formatBDT(totalCM)}</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Total Fixed Costs</div>
          <div style={styles.metricValue}>{formatBDT(totalFixed)}</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>CM Ratio</div>
          <div style={styles.metricValue}>{cmRatio ? formatPct(cmRatio * 100) : '—'}</div>
        </div>
        <div style={styles.metricCard}>
          <div style={styles.metricLabel}>Break-Even Revenue</div>
          <div style={styles.metricValue}>{beRev ? formatBDT(beRev) : '—'}</div>
        </div>
      </div>

      {/* Fixed Costs Input */}
      <div style={styles.costsCard}>
        <div style={styles.costsHeader}>
          <h3 style={{ fontWeight: 700, fontSize: 16 }}>Monthly Fixed Costs</h3>
          <button onClick={saveCosts} disabled={saving} style={styles.saveBtn}>
            <Save size={13} /> {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
        <div style={styles.costsGrid}>
          {[
            { key: 'rent',           label: 'Rent' },
            { key: 'salaries',       label: 'Salaries' },
            { key: 'utilities',      label: 'Utilities' },
            { key: 'other_overhead', label: 'Other Overhead' },
          ].map(({ key, label }) => (
            <label key={key} style={styles.costField}>
              <span style={styles.costLabel}>{label}</span>
              <div style={styles.priceWrap}>
                <span style={styles.currencyPfx}>৳</span>
                <input
                  type="number" min="0" step="1"
                  value={costs[key]}
                  onChange={e => setCosts(p => ({ ...p, [key]: e.target.value }))}
                  style={{ ...inS, paddingLeft: 28 }}
                  placeholder="0"
                />
              </div>
            </label>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={styles.costLabel}>Notes (optional)</label>
          <textarea
            value={costs.notes}
            onChange={e => setCosts(p => ({ ...p, notes: e.target.value }))}
            rows={2}
            style={{ ...inS, width: '100%', marginTop: 6, resize: 'vertical' }}
            placeholder="Any notes about this month's overhead…"
          />
        </div>
        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Total Fixed Costs</span>
          <span style={styles.totalValue}>{formatBDT(totalFixed)}</span>
        </div>
      </div>

      {/* Trend Chart */}
      <div style={styles.chartCard}>
        <div style={styles.chartTitle}>6–12 Month Trend</div>
        <div style={styles.chartSub}>Contribution Margin vs Fixed Costs over time</div>
        <TrendChart data={trendData} />
      </div>
    </div>
  )
}

const inS = {
  padding: '9px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-medium)',
  background: 'var(--bg-subtle)',
  color: 'var(--text-primary)',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  width: '100%',
}

const styles = {
  secHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  secTitle:    { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  secSub:      { fontSize: 13, color: 'var(--text-muted)' },
  profitBanner:{ display: 'flex', alignItems: 'center', gap: 20, border: '2px solid', borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 24 },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 },
  metricCard:  { background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px 18px' },
  metricLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
  metricValue: { fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  costsCard:   { background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '20px 22px', marginBottom: 24 },
  costsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  costsGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 },
  costField:   { display: 'flex', flexDirection: 'column', gap: 6 },
  costLabel:   { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  priceWrap:   { position: 'relative' },
  currencyPfx: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 },
  totalRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: 14, marginTop: 14 },
  totalLabel:  { fontWeight: 700, fontSize: 14 },
  totalValue:  { fontWeight: 800, fontSize: 22, fontVariantNumeric: 'tabular-nums' },
  chartCard:   { background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '20px 22px' },
  chartTitle:  { fontWeight: 700, fontSize: 16, marginBottom: 4 },
  chartSub:    { fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 },
  saveBtn:     { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--accent-brown)', color: '#fff', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' },
  outlineBtn:  { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'none', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' },
}
