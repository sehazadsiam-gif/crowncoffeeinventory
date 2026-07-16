'use client'
import { useState, useCallback } from 'react'
import {
  contributionMargin, foodCostPercent, netMarginAfterCommission,
  netFoodCostPctAfterCommission, foodCostColor, formatBDT, formatPct,
  calculateFixedCostPricing, calculatePriceFromTargetProfit, calculateOnlineChannelMetrics
} from '../../../lib/costing-calculations'
import { Save, AlertTriangle, Settings, X, Plus, Trash2, Calculator, Info } from 'lucide-react'
import PricingCalculatorModal from '../../menu-costings/PricingCalculatorModal'

// Food cost badge
function FCBadge({ pct }) {
  const color = foodCostColor(pct)
  const map = {
    green:   { bg: 'var(--success-bg)', text: 'var(--success)' },
    yellow:  { bg: 'var(--warning-bg)', text: 'var(--warning)' },
    red:     { bg: 'var(--danger-bg)', text: 'var(--danger)' },
    neutral: { bg: 'var(--bg-subtle)', text: 'var(--text-muted)' }
  }
  const { bg, text } = map[color] || map.neutral
  return (
    <span style={{ background: bg, color: text, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {formatPct(pct)}
    </span>
  )
}

export default function SectionA({ items, channels, onSave }) {
  // localPrices: { [itemId]: { dineIn: '', channelPrices: { [channelId]: { price:'', commission:'', discount:'' } } } }
  const [localPrices, setLocalPrices] = useState(() => {
    const m = {}
    items.forEach(item => {
      m[item.id] = {
        dineIn: item.dine_in_price ?? '',
        channelPrices: Object.fromEntries(
          channels.map(ch => [ch.id, {
            price:      item.channel_prices?.[ch.id]?.selling_price ?? '',
            commission: item.channel_prices?.[ch.id]?.commission_pct ?? '',
            discount:   item.channel_prices?.[ch.id]?.discount_pct ?? '',
          }])
        ),
      }
    })
    return m
  })

  const [saving, setSaving]                 = useState({})
  const [showChannelMgr, setShowChannelMgr] = useState(false)
  const [newChanName, setNewChanName]       = useState('')
  const [channelList, setChannelList]       = useState(channels)
  const [losingThreshold, setLosingThreshold] = useState(0) // min net margin
  const [calcModalItem, setCalcModalItem]   = useState(null) // item object for calculator

  function setDineIn(itemId, val) {
    setLocalPrices(p => ({ ...p, [itemId]: { ...p[itemId], dineIn: val } }))
  }

  function setTargetProfitForDineIn(itemId, cogs, profitVal) {
    const newPrice = calculatePriceFromTargetProfit(cogs, parseFloat(profitVal) || 0)
    setDineIn(itemId, newPrice)
  }

  function setChannelPrice(itemId, chanId, field, val) {
    setLocalPrices(p => ({
      ...p,
      [itemId]: {
        ...p[itemId],
        channelPrices: {
          ...p[itemId].channelPrices,
          [chanId]: { ...p[itemId].channelPrices[chanId], [field]: val },
        },
      },
    }))
  }

  async function saveItem(item) {
    setSaving(s => ({ ...s, [item.id]: true }))
    const local = localPrices[item.id] || {}
    const channelPrices = channelList.map(ch => ({
      channelId:    ch.id,
      sellingPrice: parseFloat(local.channelPrices?.[ch.id]?.price) || 0,
      commissionPct: parseFloat(local.channelPrices?.[ch.id]?.commission) || 0,
      discountPct:   parseFloat(local.channelPrices?.[ch.id]?.discount) || 0,
    }))
    await fetch('/api/admin/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menuItemId:   item.id,
        dineInPrice:  parseFloat(local.dineIn) || 0,
        channelPrices,
      }),
    })
    if (onSave) onSave()
    setSaving(s => ({ ...s, [item.id]: false }))
  }

  async function addChannel() {
    if (!newChanName.trim()) return
    const res = await fetch('/api/admin/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newChanName.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setChannelList(c => [...c, data])
      setNewChanName('')
    }
  }

  async function deleteChannel(id) {
    await fetch(`/api/admin/channels?id=${id}`, { method: 'DELETE' })
    setChannelList(c => c.filter(ch => ch.id !== id))
  }

  // Compute "Losing Money Online" list
  const losingItems = items.flatMap(item => {
    const local = localPrices[item.id]
    return channelList.flatMap(ch => {
      const cp = local?.channelPrices?.[ch.id]
      const sp = parseFloat(cp?.price) || 0
      const com = parseFloat(cp?.commission) || 0
      const disc = parseFloat(cp?.discount) || 0
      if (!sp) return []
      const om = calculateOnlineChannelMetrics(sp, item.current_cogs, com, disc)
      if (om.onlineProfit <= losingThreshold || om.isLoss) {
        return [{
          item: item.name,
          channel: ch.name,
          profit: om.onlineProfit,
          sp, com, disc,
          netPayout: om.netPayout,
          baseCost: om.baseCost,
          isLoss: om.isLoss
        }]
      }
      return []
    })
  }).sort((a, b) => a.profit - b.profit)

  return (
    <div>
      {/* Header */}
      <div style={styles.secHeader}>
        <div>
          <h2 style={styles.secTitle}>Items &amp; Pricing</h2>
          <p style={styles.secSub}>
            Fixed Anchor Model: <strong>Price = Making Cost + Utilities (1:1) + Net Profit</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setCalcModalItem(items[0] || { current_cogs: 25, dine_in_price: 75 })} style={styles.calcBtn}>
            <Calculator size={14} /> Open Calculator
          </button>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            Alert if Online Profit &lt;
            <input type="number" value={losingThreshold}
              onChange={e => setLosingThreshold(parseFloat(e.target.value)||0)}
              style={{ ...inS, width: 70 }} />
            ৳
          </label>
          <button onClick={() => setShowChannelMgr(true)} style={styles.outlineBtn}>
            <Settings size={14} /> Channels
          </button>
        </div>
      </div>

      {/* Losing Money Alert */}
      {losingItems.length > 0 && (
        <div style={styles.alertBox}>
          <div style={styles.alertTitle}>
            <AlertTriangle size={16} /> Losing Money / Low Profit Online ({losingItems.length} item/channel)
          </div>
          <div style={styles.alertList}>
            {losingItems.map((a, i) => (
              <div key={i} style={styles.alertRow}>
                <span>
                  <strong>{a.item}</strong> · {a.channel} (Disc {a.disc}% · Comm {a.com}% · Payout {formatBDT(a.netPayout)} vs Base Cost {formatBDT(a.baseCost)})
                </span>
                <span style={{ color: a.isLoss ? 'var(--danger)' : 'var(--warning)', fontWeight: 700 }}>
                  {a.isLoss ? `LOSS ${formatBDT(a.profit)}` : `Net ${formatBDT(a.profit)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items Table — Fully Responsive */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={{ ...styles.th, minWidth: 160 }}>Item</th>
              <th style={styles.th}>Making Cost</th>
              <th style={styles.th}>Utilities (1:1)</th>
              <th style={styles.th}>Base Cost</th>
              <th style={{ ...styles.th, minWidth: 110 }}>Dine-in Price</th>
              <th style={{ ...styles.th, minWidth: 100 }}>Target Profit (৳)</th>
              <th style={styles.th}>Net Profit (৳)</th>
              <th style={styles.th}>FC% (Dine)</th>
              {channelList.map(ch => (
                <tr key={ch.id} style={{ display: 'contents' }}>
                  <th style={{ ...styles.th, minWidth: 110, background: 'var(--bg-subtle)' }}>{ch.name} Price</th>
                  <th style={{ ...styles.th, minWidth: 75, background: 'var(--bg-subtle)' }}>Disc %</th>
                  <th style={{ ...styles.th, minWidth: 75, background: 'var(--bg-subtle)' }}>Comm %</th>
                  <th style={{ ...styles.th, minWidth: 95, background: 'var(--bg-subtle)' }}>Net Payout</th>
                  <th style={{ ...styles.th, minWidth: 100, background: 'var(--bg-subtle)' }}>Online Profit</th>
                  <th style={{ ...styles.th, minWidth: 80, background: 'var(--bg-subtle)' }}>Net FC%</th>
                </tr>
              ))}
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const local   = localPrices[item.id] || {}
              const cogs    = item.current_cogs || 0
              const dineIn  = parseFloat(local.dineIn) || 0

              const anchor  = calculateFixedCostPricing(cogs, dineIn)

              return (
                <tr key={item.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>
                    <div>{item.name}</div>
                    <button
                      onClick={() => setCalcModalItem(item)}
                      style={styles.inlineCalcBtn}
                      title="Calculate margins for this item"
                    >
                      <Calculator size={11} /> Calc
                    </button>
                  </td>
                  <td style={styles.td}>{formatBDT(anchor.makingCost)}</td>
                  <td style={styles.td}>{formatBDT(anchor.utilitiesCharge)}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{formatBDT(anchor.baseCost)}</td>

                  {/* Dine-in price input */}
                  <td style={styles.td}>
                    <div style={styles.priceInputWrap}>
                      <span style={styles.currencyPrefix}>৳</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={local.dineIn}
                        onChange={e => setDineIn(item.id, e.target.value)}
                        style={{ ...inS, width: 85, paddingLeft: 22, fontWeight: 700 }}
                        placeholder="0"
                      />
                    </div>
                  </td>

                  {/* Target Profit Input (auto-syncs with Selling Price!) */}
                  <td style={styles.td}>
                    <div style={styles.priceInputWrap}>
                      <span style={styles.currencyPrefix}>৳</span>
                      <input
                        type="number" step="0.01"
                        value={dineIn ? Math.round(anchor.netProfit) : ''}
                        onChange={e => setTargetProfitForDineIn(item.id, cogs, e.target.value)}
                        style={{ ...inS, width: 80, paddingLeft: 22 }}
                        placeholder="0"
                      />
                    </div>
                  </td>

                  {/* Net Profit Display */}
                  <td style={{
                    ...styles.td,
                    color: anchor.isLoss ? 'var(--danger)' : anchor.profitSacrificed > 0 ? 'var(--warning)' : 'var(--success)',
                    fontWeight: 700,
                  }}>
                    {dineIn ? formatBDT(anchor.netProfit) : '—'}
                    {anchor.profitSacrificed > 0 && (
                      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--warning)' }}>
                        (-{formatBDT(anchor.profitSacrificed)} promo)
                      </div>
                    )}
                  </td>

                  {/* FC% (Dine) */}
                  <td style={styles.td}>
                    <FCBadge pct={anchor.foodCostPct} />
                  </td>

                  {/* Channel columns */}
                  {channelList.map(ch => {
                    const cp   = local.channelPrices?.[ch.id]
                    const sp   = parseFloat(cp?.price) || 0
                    const com  = parseFloat(cp?.commission) || 0
                    const disc = parseFloat(cp?.discount) || 0

                    const om   = sp ? calculateOnlineChannelMetrics(sp, cogs, com, disc) : null
                    const profitColor = om !== null ? (om.isLoss ? 'var(--danger)' : om.isThinProfit ? 'var(--warning)' : 'var(--success)') : 'var(--text-muted)'

                    return (
                      <tr key={ch.id} style={{ display: 'contents' }}>
                        {/* App Listed Price */}
                        <td style={styles.td}>
                          <div style={styles.priceInputWrap}>
                            <span style={styles.currencyPrefix}>৳</span>
                            <input type="number" min="0" step="0.01"
                              value={cp?.price ?? ''}
                              onChange={e => setChannelPrice(item.id, ch.id, 'price', e.target.value)}
                              style={{ ...inS, width: 80, paddingLeft: 22 }}
                              placeholder="0"
                            />
                          </div>
                        </td>

                        {/* Customer Discount % */}
                        <td style={styles.td}>
                          <input type="number" min="0" max="100" step="0.5"
                            value={cp?.discount ?? ''}
                            onChange={e => setChannelPrice(item.id, ch.id, 'discount', e.target.value)}
                            style={{ ...inS, width: 55 }}
                            placeholder="0%"
                          />
                        </td>

                        {/* Platform Commission % */}
                        <td style={styles.td}>
                          <input type="number" min="0" max="100" step="0.5"
                            value={cp?.commission ?? ''}
                            onChange={e => setChannelPrice(item.id, ch.id, 'commission', e.target.value)}
                            style={{ ...inS, width: 55 }}
                            placeholder="0%"
                          />
                        </td>

                        {/* Net Payout from App */}
                        <td style={{ ...styles.td, fontWeight: 600 }}>
                          {om ? formatBDT(om.netPayout) : '—'}
                        </td>

                        {/* Online Profit (Taka) */}
                        <td style={{ ...styles.td, color: profitColor, fontWeight: 700 }}>
                          {om ? (
                            <div>
                              <div>{formatBDT(om.onlineProfit)}</div>
                              {om.isLoss && (
                                <div style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 800 }}>
                                  LOSS!
                                </div>
                              )}
                            </div>
                          ) : '—'}
                        </td>

                        {/* Net FC% */}
                        <td style={styles.td}>
                          {om ? <FCBadge pct={om.netFoodCostPct} /> : '—'}
                        </td>
                      </tr>
                    )
                  })}

                  <td style={styles.td}>
                    <button
                      onClick={() => saveItem(item)}
                      disabled={saving[item.id]}
                      style={{ ...styles.saveBtnSm, opacity: saving[item.id] ? 0.6 : 1 }}
                    >
                      <Save size={12} /> {saving[item.id] ? '…' : 'Save'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr><td colSpan={99} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                No menu items found. Ask the chef to add items in Menu Costings first.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pricing Calculator Modal */}
      <PricingCalculatorModal
        isOpen={!!calcModalItem}
        onClose={() => setCalcModalItem(null)}
        initialCogs={calcModalItem?.current_cogs || 25}
        initialPrice={localPrices[calcModalItem?.id]?.dineIn || calcModalItem?.dine_in_price || 75}
      />

      {/* Channel Manager Modal */}
      {showChannelMgr && (
        <div style={styles.overlay} onClick={() => setShowChannelMgr(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Manage Delivery Channels</span>
              <button onClick={() => setShowChannelMgr(false)} style={styles.closeBtn}><X size={16}/></button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {channelList.map(ch => (
                <div key={ch.id} style={styles.chanRow}>
                  <span style={{ fontSize: 14 }}>{ch.name}</span>
                  <button onClick={() => deleteChannel(ch.id)} style={styles.deleteBtn}><Trash2 size={13}/></button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input type="text" value={newChanName} onChange={e => setNewChanName(e.target.value)}
                  placeholder="New channel name" style={{ ...inS, flex: 1 }} />
                <button onClick={addChannel} style={styles.saveBtnSm}><Plus size={13}/> Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Inline input style
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
  secHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  secTitle:  { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  secSub:    { fontSize: 13, color: 'var(--text-muted)' },
  calcBtn:   { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--accent-brown), var(--accent-brown-dark))', color: '#fff', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' },
  inlineCalcBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, background: 'var(--accent-brown-dim)', color: 'var(--accent-brown)', fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: 4, fontFamily: 'var(--font-sans)' },
  alertBox:  { background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 20 },
  alertTitle:{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--danger)', marginBottom: 10, fontSize: 14 },
  alertList: { display: 'flex', flexDirection: 'column', gap: 6 },
  alertRow:  { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' },
  tableWrapper: { overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', maxWidth: '100%' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thead:     { background: 'var(--bg-subtle)' },
  th:        { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-light)' },
  tr:        { borderBottom: '1px solid var(--border-light)' },
  td:        { padding: '10px 12px', color: 'var(--text-primary)', verticalAlign: 'middle', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  priceInputWrap: { position: 'relative', display: 'inline-block' },
  currencyPrefix: { position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)', pointerEvents: 'none' },
  saveBtnSm: { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-brown)', color: '#fff', fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' },
  outlineBtn:{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'none', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' },
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal:     { background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', width: '100%', maxWidth: 440 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-light)' },
  closeBtn:  { width: 28, height: 28, borderRadius: 6, border: 'none', background: 'var(--bg-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' },
  chanRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: 4 },
}
