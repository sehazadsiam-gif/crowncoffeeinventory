'use client'
import { useState } from 'react'
import { X, Calculator, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { calculateFixedCostPricing, calculateFormulaPrice, calculatePriceFromTargetProfit, formatBDT, formatPct, MULTIPLIER_PRESETS } from '../../lib/costing-calculations'

export default function PricingCalculatorModal({ isOpen, onClose, initialCogs = 25, initialPrice = 75 }) {
  const [cogs, setCogs]                 = useState(initialCogs || 25)
  const [utilitiesRatio, setUtilRatio] = useState(1.0)
  const [sellingPrice, setPrice]       = useState(initialPrice || 75)
  const [targetProfit, setTargetProfit]= useState(25)
  const [activeMode, setActiveMode]    = useState('price') // 'price' | 'profit' | 'multiplier'

  if (!isOpen) return null

  const metrics = calculateFixedCostPricing(cogs, sellingPrice, utilitiesRatio)

  function handlePriceChange(val) {
    setPrice(val)
    const newMetrics = calculateFixedCostPricing(cogs, val, utilitiesRatio)
    setTargetProfit(newMetrics.netProfit)
    setActiveMode('price')
  }

  function handleProfitChange(val) {
    setTargetProfit(val)
    const newPrice = calculatePriceFromTargetProfit(cogs, val, utilitiesRatio)
    setPrice(newPrice)
    setActiveMode('profit')
  }

  function handleMultiplierPreset(mult) {
    const newPrice = calculateFormulaPrice(cogs, mult)
    setPrice(newPrice)
    const newMetrics = calculateFixedCostPricing(cogs, newPrice, utilitiesRatio)
    setTargetProfit(newMetrics.netProfit)
    setActiveMode('multiplier')
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div style={styles.headerTitle}>
            <Calculator size={20} color="var(--accent-brown)" />
            <span>Crown Coffee Pricing &amp; Margin Calculator</span>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Close calculator">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.modalBody}>
          <p style={styles.subtext}>
            Anchor Model: <strong>Selling Price = Making Cost + Utilities (1:1) + Net Profit</strong>
          </p>

          <div style={styles.inputGrid}>
            {/* Making Cost Input */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Making Cost / COGS (৳)</label>
              <div style={styles.inputWrap}>
                <span style={styles.pfx}>৳</span>
                <input
                  id="calc-cogs-input"
                  type="number" min="0" step="any"
                  value={cogs}
                  onChange={e => {
                    const newCogs = parseFloat(e.target.value) || 0
                    setCogs(newCogs)
                    if (activeMode === 'profit') {
                      setPrice(calculatePriceFromTargetProfit(newCogs, targetProfit, utilitiesRatio))
                    }
                  }}
                  style={styles.input}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Selling Price Input */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Selling Price (৳)</label>
              <div style={styles.inputWrap}>
                <span style={styles.pfx}>৳</span>
                <input
                  id="calc-price-input"
                  type="number" min="0" step="any"
                  value={sellingPrice}
                  onChange={e => handlePriceChange(parseFloat(e.target.value) || 0)}
                  style={{ ...styles.input, fontWeight: 700, color: 'var(--accent-brown)' }}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Target Profit Input */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Target Net Profit (৳)</label>
              <div style={styles.inputWrap}>
                <span style={styles.pfx}>৳</span>
                <input
                  id="calc-profit-input"
                  type="number" step="any"
                  value={targetProfit}
                  onChange={e => handleProfitChange(parseFloat(e.target.value) || 0)}
                  style={{ ...styles.input, fontWeight: 700, color: metrics.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Quick Formula Multipliers */}
          <div style={styles.presetSection}>
            <span style={styles.presetLabel}>Quick Formula Multipliers ((COGS+5%) × M):</span>
            <div style={styles.presetGrid}>
              {MULTIPLIER_PRESETS.map(m => {
                const p = calculateFormulaPrice(cogs, m)
                return (
                  <button
                    key={m}
                    onClick={() => handleMultiplierPreset(m)}
                    style={{
                      ...styles.presetBtn,
                      background: sellingPrice === p ? 'var(--accent-brown)' : 'var(--bg-subtle)',
                      color:      sellingPrice === p ? '#fff' : 'var(--text-primary)',
                      borderColor:sellingPrice === p ? 'var(--accent-brown)' : 'var(--border-medium)',
                    }}
                  >
                    {m.toFixed(m % 1 === 0 ? 1 : 2)}× ({formatBDT(p)})
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3-Way Split Visual Bar */}
          <div style={styles.visualBarCard}>
            <div style={styles.barHeader}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>3-Way Breakdown</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Food Cost: <strong>{formatPct(metrics.foodCostPct)}</strong> (Max 33%)
              </span>
            </div>

            <div style={styles.barWrap}>
              {metrics.foodCostPct > 0 && (
                <div
                  title={`Making Cost: ${formatBDT(metrics.makingCost)} (${formatPct(metrics.foodCostPct)})`}
                  style={{ width: `${Math.min(100, Math.max(0, metrics.foodCostPct))}%`, background: metrics.foodCostPct <= 33 ? '#10B981' : '#EF4444', height: '100%', transition: 'all 0.3s' }}
                />
              )}
              {metrics.utilitiesPct > 0 && (
                <div
                  title={`Utilities: ${formatBDT(metrics.utilitiesCharge)} (${formatPct(metrics.utilitiesPct)})`}
                  style={{ width: `${Math.min(100, Math.max(0, metrics.utilitiesPct))}%`, background: '#F59E0B', height: '100%', transition: 'all 0.3s' }}
                />
              )}
              {metrics.netProfitPct > 0 && (
                <div
                  title={`Net Profit: ${formatBDT(metrics.netProfit)} (${formatPct(metrics.netProfitPct)})`}
                  style={{ width: `${Math.min(100, Math.max(0, metrics.netProfitPct))}%`, background: '#3B82F6', height: '100%', transition: 'all 0.3s' }}
                />
              )}
            </div>

            <div style={styles.barLegend}>
              <div style={styles.legItem}>
                <div style={{ ...styles.dot, background: metrics.foodCostPct <= 33 ? '#10B981' : '#EF4444' }} />
                <span>Making Cost (COGS): <strong>{formatBDT(metrics.makingCost)}</strong> ({formatPct(metrics.foodCostPct)})</span>
              </div>
              <div style={styles.legItem}>
                <div style={{ ...styles.dot, background: '#F59E0B' }} />
                <span>Utilities (1:1): <strong>{formatBDT(metrics.utilitiesCharge)}</strong> ({formatPct(metrics.utilitiesPct)})</span>
              </div>
              <div style={styles.legItem}>
                <div style={{ ...styles.dot, background: '#3B82F6' }} />
                <span>Net Profit: <strong>{formatBDT(metrics.netProfit)}</strong> ({formatPct(metrics.netProfitPct)})</span>
              </div>
            </div>
          </div>

          {/* Status & Promo Alert Banner */}
          {metrics.isLoss ? (
            <div style={{ ...styles.statusBanner, background: 'var(--danger-bg)', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
              <AlertTriangle size={18} />
              <div>
                <strong>Selling Below Base Cost!</strong> Price of {formatBDT(sellingPrice)} does not cover Making Cost ({formatBDT(metrics.makingCost)}) + Utilities ({formatBDT(metrics.utilitiesCharge)}). Net loss: <strong>{formatBDT(Math.abs(metrics.netProfit))}</strong>.
              </div>
            </div>
          ) : metrics.profitSacrificed > 0 ? (
            <div style={{ ...styles.statusBanner, background: 'var(--warning-bg)', borderColor: 'var(--warning)', color: 'var(--warning)' }}>
              <Info size={18} />
              <div>
                <strong>Promotional Discount Active:</strong> Profit is <strong>{formatBDT(metrics.netProfit)}</strong> ({formatBDT(metrics.profitSacrificed)} given up for customer attraction). Food cost is <strong>{formatPct(metrics.foodCostPct)}</strong>.
              </div>
            </div>
          ) : (
            <div style={{ ...styles.statusBanner, background: 'var(--success-bg)', borderColor: 'var(--success)', color: 'var(--success)' }}>
              <CheckCircle size={18} />
              <div>
                <strong>Standard 1:1:1 Profit Achieved!</strong> Net Profit: <strong>{formatBDT(metrics.netProfit)}</strong> ({formatPct(metrics.netProfitPct)} of selling price). Food cost: <strong>{formatPct(metrics.foodCostPct)}</strong>.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
    zIndex: 999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  modal: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-xl)',
    width: '100%',
    maxWidth: 580,
    maxHeight: '90vh',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 22px',
    borderBottom: '1px solid var(--border-light)',
  },
  headerTitle: { display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: 16 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8,
    border: 'none', background: 'var(--bg-subtle)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-muted)',
  },
  modalBody: { padding: '20px 22px', overflowY: 'auto', flex: 1 },
  subtext: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 20 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' },
  inputWrap: { position: 'relative' },
  pfx: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)', pointerEvents: 'none' },
  input: {
    width: '100%', padding: '9px 12px 9px 28px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-medium)',
    background: 'var(--bg-subtle)',
    color: 'var(--text-primary)', fontSize: 14,
    fontFamily: 'var(--font-sans)', outline: 'none',
  },
  presetSection: { marginBottom: 20 },
  presetLabel: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 },
  presetGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  presetBtn: {
    padding: '6px 10px', borderRadius: 'var(--radius-sm)',
    border: '1px solid', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'var(--font-sans)',
    transition: 'all 0.15s',
  },
  visualBarCard: {
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    padding: '16px', marginBottom: 20,
  },
  barHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 },
  barWrap: {
    height: 14, borderRadius: 7, background: 'var(--bg-surface)',
    overflow: 'hidden', display: 'flex', marginBottom: 12,
    border: '1px solid var(--border-medium)',
  },
  barLegend: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' },
  legItem: { display: 'flex', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  statusBanner: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', borderRadius: 'var(--radius-md)',
    border: '1px solid', fontSize: 13, lineHeight: 1.4,
  },
}
