'use client'
import { useState, useCallback } from 'react'
import { classifyMenuItems, CLASSIFICATION_ACTIONS, formatBDT, formatPct, contributionMargin } from '../../../lib/costing-calculations'
import ScatterChart from './ScatterChart'
import { Upload, Save, Download } from 'lucide-react'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function SectionB({ items, pricingData, year, month, onExport }) {
  // salesData: { [itemId]: { dineIn: qty, [channelId]: qty } }
  const [salesData, setSalesData] = useState({})
  const [saved, setSaved]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [csvError, setCsvError]   = useState('')

  // Merge item info + pricing data
  const enrichedItems = items.map(item => {
    const pricing  = pricingData?.find(p => p.id === item.id)
    const dineInSp = parseFloat(pricing?.dine_in_price) || 0
    const cogs     = item.current_cogs || 0
    const dineCM   = contributionMargin(dineInSp, cogs)

    // Qty sold this month (sum across channels)
    const qtySold = Object.values(salesData[item.id] || { dineIn: 0 }).reduce((s, v) => s + (parseInt(v) || 0), 0)

    // Blended selling price (weighted by channel volumes — simplified: use dine-in for now)
    const revenue = qtySold * dineInSp
    const cogsCons = qtySold * cogs
    const cmGen    = qtySold * dineCM

    return { id: item.id, name: item.name, cogs, dineInSp, dineCM, qtySold, revenue, cogsCons, cmGen }
  })

  const totalUnitsSold = enrichedItems.reduce((s, i) => s + i.qtySold, 0)

  // Add popularity %
  const withPop = enrichedItems.map(item => ({
    ...item,
    popularity: totalUnitsSold > 0 ? (item.qtySold / totalUnitsSold) * 100 : 0,
    cm: item.dineCM,
  }))

  const classified = classifyMenuItems(withPop)

  const medianCM  = classified[0]?.medianCM  ?? 0
  const medianPop = classified[0]?.medianPop ?? 0

  // History (last 3 months classification) — would need DB; shown as placeholder
  // CSV upload
  function handleCSV(e) {
    setCsvError('')
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const text = ev.target.result
        const lines = text.split('\n').filter(l => l.trim())
        // Expected CSV: Item Name,Quantity Sold
        const newSales = { ...salesData }
        lines.slice(1).forEach(line => {
          const [name, qty] = line.split(',')
          const item = items.find(i => i.name.toLowerCase() === name?.trim().toLowerCase())
          if (item) {
            if (!newSales[item.id]) newSales[item.id] = { dineIn: 0 }
            newSales[item.id].dineIn = parseInt(qty?.trim()) || 0
          }
        })
        setSalesData(newSales)
      } catch { setCsvError('Could not parse CSV. Expected format: Item Name,Quantity Sold') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function saveSales() {
    setSaving(true)
    const entries = []
    for (const [itemId, channels] of Object.entries(salesData)) {
      // dineIn channel (null = dine-in)
      entries.push({ menuItemId: itemId, channelId: null, quantitySold: channels.dineIn || 0 })
    }
    await fetch('/api/admin/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, entries }),
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  // ─── Render ─────────────────────────────────────────────
  return (
    <div>
      <div style={styles.secHeader}>
        <div>
          <h2 style={styles.secTitle}>Monthly Sales & Item Classification</h2>
          <p style={styles.secSub}>{MONTH_NAMES[month-1]} {year} · {totalUnitsSold} units sold</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={styles.csvLabel}>
            <Upload size={13} /> Import CSV
            <input type="file" accept=".csv,.txt" onChange={handleCSV} style={{ display: 'none' }} />
          </label>
          <button onClick={saveSales} disabled={saving} style={styles.saveBtn}>
            <Save size={13} /> {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Sales'}
          </button>
          <button onClick={() => onExport('B')} style={styles.outlineBtn}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {csvError && <div style={styles.errorMsg}>{csvError}</div>}

      {/* Sales Entry Table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={{ ...styles.th, minWidth: 180 }}>Item</th>
              <th style={styles.th}>COGS</th>
              <th style={styles.th}>CM</th>
              <th style={{ ...styles.th, minWidth: 120 }}>Qty Sold</th>
              <th style={styles.th}>Revenue</th>
              <th style={styles.th}>COGS Used</th>
              <th style={styles.th}>CM Generated</th>
              <th style={styles.th}>Popularity</th>
              <th style={styles.th}>Classification</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {classified.map(item => {
              const action = CLASSIFICATION_ACTIONS[item.classification]
              return (
                <tr key={item.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{item.name}</td>
                  <td style={styles.td}>{formatBDT(item.cogs)}</td>
                  <td style={styles.td}>{item.dineInSp ? formatBDT(item.dineCM) : '—'}</td>
                  <td style={styles.td}>
                    <input
                      type="number" min="0"
                      value={salesData[item.id]?.dineIn ?? ''}
                      onChange={e => setSalesData(p => ({ ...p, [item.id]: { ...p[item.id], dineIn: e.target.value } }))}
                      style={{ ...inS, width: 90 }}
                      placeholder="0"
                    />
                  </td>
                  <td style={styles.td}>{formatBDT(item.revenue)}</td>
                  <td style={styles.td}>{formatBDT(item.cogsCons)}</td>
                  <td style={styles.td}>{formatBDT(item.cmGen)}</td>
                  <td style={styles.td}>{formatPct(item.popularity)}</td>
                  <td style={styles.td}>
                    {item.classification ? (
                      <span style={{ background: `${action.color}18`, color: action.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {item.classification}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ ...styles.td, color: 'var(--text-muted)', fontSize: 12 }}>
                    {item.classification ? action.label : '—'}
                  </td>
                </tr>
              )
            })}
            {/* Totals */}
            <tr style={{ ...styles.tr, background: 'var(--bg-subtle)', fontWeight: 700 }}>
              <td style={styles.td}>TOTAL</td>
              <td style={styles.td}></td>
              <td style={styles.td}></td>
              <td style={styles.td}>{totalUnitsSold}</td>
              <td style={styles.td}>{formatBDT(enrichedItems.reduce((s,i)=>s+i.revenue,0))}</td>
              <td style={styles.td}>{formatBDT(enrichedItems.reduce((s,i)=>s+i.cogsCons,0))}</td>
              <td style={styles.td}>{formatBDT(enrichedItems.reduce((s,i)=>s+i.cmGen,0))}</td>
              <td style={styles.td}>100%</td>
              <td style={styles.td}></td>
              <td style={styles.td}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2×2 Scatter Chart */}
      <div style={styles.chartCard}>
        <div style={styles.chartTitle}>Menu Engineering Matrix</div>
        <div style={styles.chartSub}>X = Popularity % · Y = Contribution Margin (৳) · Lines at medians</div>
        <ScatterChart items={classified} medianCM={medianCM} medianPop={medianPop} />
      </div>

      {/* Classification Summary */}
      <div style={styles.quadGrid}>
        {Object.entries(CLASSIFICATION_ACTIONS).map(([label, action]) => {
          const count = classified.filter(i => i.classification === label).length
          return (
            <div key={label} style={{ ...styles.quadCard, borderLeft: `3px solid ${action.color}` }}>
              <div style={{ color: action.color, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{count}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{action.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const inS = {
  padding: '7px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-medium)',
  background: 'var(--bg-subtle)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
}

const styles = {
  secHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  secTitle:   { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  secSub:     { fontSize: 13, color: 'var(--text-muted)' },
  csvLabel:   { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'none', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' },
  saveBtn:    { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--accent-brown)', color: '#fff', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' },
  outlineBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'none', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' },
  errorMsg:   { background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 12 },
  tableWrapper:{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', marginBottom: 24 },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thead:      { background: 'var(--bg-subtle)' },
  th:         { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-light)' },
  tr:         { borderBottom: '1px solid var(--border-light)' },
  td:         { padding: '10px 12px', color: 'var(--text-primary)', verticalAlign: 'middle', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  chartCard:  { background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: 24 },
  chartTitle: { fontWeight: 700, fontSize: 16, marginBottom: 4 },
  chartSub:   { fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 },
  quadGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  quadCard:   { background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px 18px' },
}
