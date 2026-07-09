'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { useToast } from '../../components/Toast'
import { 
  Calendar, Info, Play, Save, CheckCircle2, 
  TrendingUp, TrendingDown, Package, HelpCircle, 
  Clock, AlertTriangle, ArrowLeftRight, Calculator
} from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function StockAuditPage() {
  const router = useRouter()
  const { addToast } = useToast()
  
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [auditData, setAuditData] = useState({
    exists: false,
    audit: null,
    items: [],
    liveIngredients: [],
    totalPurchases: 0,
    totalSales: 0,
    ingredients: [] // Preview list when exists = false
  })

  // Closing stock input state: map of ingredient_id -> { closing_qty, closing_cost }
  const [formInputs, setFormInputs] = useState({})

  const fetchAudit = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stock/audit?month=${month}&year=${year}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch audit data')
      
      setAuditData(data)
      
      // Initialize inputs if audit is open or doesn't exist
      if (data.exists && data.audit?.status === 'open') {
        const inputs = {}
        data.items.forEach(item => {
          // Pre-fill with live stock count from db as a starting point
          const live = data.liveIngredients.find(l => l.id === item.ingredient_id)
          inputs[item.ingredient_id] = {
            closing_qty: live ? live.current_stock : item.opening_qty,
            closing_cost: live ? live.cost_per_unit : item.opening_cost
          }
        })
        setFormInputs(inputs)
      }
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [month, year, addToast])

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin')) {
      router.replace('/')
      return
    }
    fetchAudit()
  }, [fetchAudit, router])

  const startAudit = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/stock/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start audit')
      
      addToast(`Monthly audit started for ${MONTHS[month-1]} ${year}!`, 'success')
      fetchAudit()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (ingId, field, val) => {
    setFormInputs(prev => ({
      ...prev,
      [ingId]: {
        ...prev[ingId],
        [field]: val
      }
    }))
  }

  const submitAudit = async () => {
    // Validate inputs
    const payloadItems = []
    let isValid = true
    
    auditData.items.forEach(item => {
      const inputs = formInputs[item.ingredient_id]
      if (!inputs || inputs.closing_qty === '' || inputs.closing_cost === '') {
        isValid = false
        return
      }
      payloadItems.push({
        ingredient_id: item.ingredient_id,
        closing_qty: parseFloat(inputs.closing_qty),
        closing_cost: parseFloat(inputs.closing_cost)
      })
    })

    if (!isValid) {
      addToast('Please enter remaining quantity and price for all items', 'warning')
      return
    }

    if (!confirm('Are you sure you want to complete this audit? This will overwrite all current stock levels in the database with the closing quantities entered.')) {
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/stock/audit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          year,
          items: payloadItems
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to complete audit')

      addToast(`Audit completed! Monthly Bazar Ratio: ${(data.bazarRatio * 100).toFixed(2)}%`, 'success')
      fetchAudit()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Calculate live values for current open audit form
  const getOpenAuditSummary = () => {
    if (!auditData.exists || auditData.audit?.status !== 'open') return { openingValue: 0, closingValue: 0, calculatedRatio: 0 }
    
    const openingValue = Number(auditData.audit.opening_stock_value) || 0
    let closingValue = 0
    
    auditData.items.forEach(item => {
      const input = formInputs[item.ingredient_id]
      if (input) {
        closingValue += (Number(input.closing_qty) || 0) * (Number(input.closing_cost) || 0)
      }
    })

    const purchases = Number(auditData.totalPurchases) || 0
    const sales = Number(auditData.totalSales) || 0
    
    // (Opening + Purchases - Closing) / Sales
    const calculatedRatio = sales > 0 ? (openingValue + purchases - closingValue) / sales : 0

    return {
      openingValue,
      closingValue,
      calculatedRatio
    }
  }

  const openSummary = getOpenAuditSummary()

  // Format ratio to percentage string
  const formatRatio = (val) => {
    return `${(val * 100).toFixed(1)}%`
  }

  // Determine health level of Bazar Ratio (e.g. good is under 35%, warning 35-45%, danger above 45%)
  const getRatioStatus = (ratio) => {
    const pct = ratio * 100
    if (pct <= 0) return { label: 'No Sales Data', color: 'var(--text-muted)', bg: 'var(--bg-subtle)' }
    if (pct < 32) return { label: 'Optimal Efficiency', color: '#10B981', bg: 'rgba(16,185,129,0.1)' }
    if (pct <= 40) return { label: 'Moderate Costing', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' }
    return { label: 'High Material Cost', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' }
  }

  const activeAuditState = auditData.exists ? auditData.audit.status : 'none'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'var(--font-sans)' }}>
      <Navbar />

      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 80px' }}>
        
        {/* HEADER SECTION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>
              Monthly Bazar Cost Ratio Audit
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              Calculate the ratio of ingredient utilization cost to total sales revenue.
            </p>
          </div>

          {/* Month picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', border: '1.5px solid var(--border-light)', borderRadius: '12px', padding: '8px 14px' }}>
            <select 
              value={month} 
              onChange={e => setMonth(parseInt(e.target.value))}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              {MONTHS.map((m, idx) => <option key={m} value={idx + 1}>{m}</option>)}
            </select>
            <span style={{ color: 'var(--border-medium)', fontSize: '14px' }}>|</span>
            <select 
              value={year} 
              onChange={e => setYear(parseInt(e.target.value))}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="instruction-box" style={{ marginBottom: '24px' }}>
          💡 <strong>Bazar Cost Ratio Formula</strong> = <code>(Opening Stock + Purchases - Closing Stock) / Total Sales</code>.
          This ratio measures what percentage of your revenue is spent on inventory usage. A lower ratio indicates higher operational profitability.
        </div>

        {loading ? (
          <div style={{ padding: '80px', display: 'flex', justifyContent: 'center' }}>
            <div className="loader" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* AUDIT DASHBOARD OVERVIEW */}
            {activeAuditState === 'none' && (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '18px', padding: '40px 32px', textAlign: 'center' }}>
                <div style={{ background: 'var(--bg-subtle)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--text-muted)' }}>
                  <Calculator size={32} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                  No Audit Started for {MONTHS[month-1]} {year}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '500px', margin: '0 auto 24px', lineHeight: 1.5 }}>
                  Starting an audit will snapshot all current inventory levels and prices as the <strong>Opening Stock</strong>. 
                  You can track sales and purchases during the month, then submit the remaining stock (Closing Stock) at the end of the month.
                </p>
                <button 
                  onClick={startAudit} 
                  disabled={saving}
                  className="btn-primary"
                  style={{ padding: '12px 24px', borderRadius: '10px', gap: '8px', fontSize: '15px' }}
                >
                  <Play size={16} /> Start Monthly Audit
                </button>

                {/* Audit preview list */}
                {auditData.ingredients?.length > 0 && (
                  <div style={{ marginTop: '36px', textAlign: 'left', borderTop: '1px solid var(--border-light)', paddingTop: '28px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                      Audit Snapshot Preview ({auditData.ingredients.length} items)
                    </h4>
                    <div style={{ overflowX: 'auto', maxHeight: '300px', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Ingredient</th>
                            <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>Current Stock Level</th>
                            <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>Live Unit Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditData.ingredients.map(ing => (
                            <tr key={ing.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{ing.name}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{ing.current_stock} {ing.unit}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>৳{Number(ing.cost_per_unit || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OPEN AUDIT CONTROLLER */}
            {activeAuditState === 'open' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                
                {/* 1. Audit Progress KPI Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '18px', position: 'relative' }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Opening Stock Value</p>
                    <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      ৳{openSummary.openingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Captured at start of month</span>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '18px' }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Monthly Purchases (Bazar)</p>
                    <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 900, color: '#F97316', letterSpacing: '-0.02em' }}>
                      + ৳{Number(auditData.totalPurchases).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Bazar entries logged this month</span>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '18px' }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>3. Closing Stock Value</p>
                    <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 900, color: 'var(--accent-blue)', letterSpacing: '-0.02em' }}>
                      - ৳{openSummary.closingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Calculated from inputs below</span>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '18px' }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>4. Total Monthly Sales</p>
                    <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 900, color: '#10B981', letterSpacing: '-0.02em' }}>
                      ৳{Number(auditData.totalSales).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Sales logs for this period</span>
                  </div>

                  {/* Calculated Ratio Result */}
                  <div style={{ 
                    background: 'var(--bg-surface)', 
                    border: '2px solid var(--primary)', 
                    borderRadius: '16px', 
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Bazar Ratio</p>
                    <p style={{ margin: '4px 0 2px', fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                      {formatRatio(openSummary.calculatedRatio)}
                    </p>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: 700, 
                      padding: '2px 8px', 
                      borderRadius: '100px', 
                      alignSelf: 'flex-start',
                      color: getRatioStatus(openSummary.calculatedRatio).color,
                      background: getRatioStatus(openSummary.calculatedRatio).bg
                    }}>
                      {getRatioStatus(openSummary.calculatedRatio).label}
                    </span>
                  </div>
                </div>

                {/* 2. Audit Input Form */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        Enter Closing Stock Levels
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Input remaining physical quantities and their current prices. Stocks will automatically overwrite current database values when saved.
                      </p>
                    </div>
                    <button 
                      onClick={submitAudit} 
                      disabled={saving}
                      className="btn-primary"
                      style={{ padding: '10px 20px', borderRadius: '8px', gap: '8px' }}
                    >
                      {saving ? 'Processing...' : <><Save size={16} /> Save & Overwrite Stock</>}
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-subtle)', borderBottom: '2px solid var(--border-light)' }}>
                          <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ingredient</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Opening Stock</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Live Stock (DB)</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', width: '160px' }}>Remaining Qty</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', width: '160px' }}>Unit Price (৳)</th>
                          <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Closing Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditData.items.map(item => {
                          const inputs = formInputs[item.ingredient_id] || { closing_qty: '', closing_cost: '' }
                          const live = auditData.liveIngredients.find(l => l.id === item.ingredient_id)
                          const calculatedVal = (parseFloat(inputs.closing_qty) || 0) * (parseFloat(inputs.closing_cost) || 0)
                          
                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <td style={{ padding: '16px 24px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.ingredients?.name}</span>
                                <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>({item.ingredients?.unit})</span>
                              </td>
                              <td style={{ padding: '16px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {item.opening_qty} {item.ingredients?.unit}
                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-faint)' }}>@ ৳{item.opening_cost}</span>
                              </td>
                              <td style={{ padding: '16px 16px', textAlign: 'right', color: 'var(--text-muted)' }}>
                                {live ? live.current_stock : '—'} {item.ingredients?.unit}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ position: 'relative' }}>
                                  <input 
                                    type="number" 
                                    className="input" 
                                    placeholder="Remaining..."
                                    value={inputs.closing_qty}
                                    onChange={e => handleInputChange(item.ingredient_id, 'closing_qty', e.target.value)}
                                    style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px' }}
                                  />
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ position: 'relative' }}>
                                  <input 
                                    type="number" 
                                    className="input" 
                                    placeholder="Price..."
                                    value={inputs.closing_cost}
                                    onChange={e => handleInputChange(item.ingredient_id, 'closing_cost', e.target.value)}
                                    style={{ padding: '6px 10px', fontSize: '13px', borderRadius: '6px' }}
                                  />
                                </div>
                              </td>
                              <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 700 }}>
                                ৳{calculatedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* CLOSED AUDIT HISTORY REPORT */}
            {activeAuditState === 'closed' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* 1. Final KPI summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '20px' }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opening Stock Value</p>
                    <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      ৳{Number(auditData.audit.opening_stock_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '20px' }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Purchases (Bazar)</p>
                    <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 900, color: '#F97316', letterSpacing: '-0.02em' }}>
                      + ৳{Number(auditData.audit.total_purchases_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '20px' }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closing Stock Value</p>
                    <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 900, color: 'var(--accent-blue)', letterSpacing: '-0.02em' }}>
                      - ৳{Number(auditData.audit.closing_stock_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '20px' }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Monthly Sales</p>
                    <p style={{ margin: '8px 0 0', fontSize: '24px', fontWeight: 900, color: '#10B981', letterSpacing: '-0.02em' }}>
                      ৳{Number(auditData.audit.total_sales_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  {/* Calculated Ratio Result */}
                  <div style={{ 
                    background: 'var(--bg-surface)', 
                    border: '2px solid #10B981', 
                    borderRadius: '16px', 
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Bazar Ratio</p>
                    <p style={{ margin: '4px 0 2px', fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                      {formatRatio(auditData.audit.bazar_ratio)}
                    </p>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: 700, 
                      padding: '2px 8px', 
                      borderRadius: '100px', 
                      alignSelf: 'flex-start',
                      color: getRatioStatus(auditData.audit.bazar_ratio).color,
                      background: getRatioStatus(auditData.audit.bazar_ratio).bg
                    }}>
                      {getRatioStatus(auditData.audit.bazar_ratio).label}
                    </span>
                  </div>
                </div>

                {/* Audit Items comparison table */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        Audit Complete & Reconciled
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        This audit was locked on {new Date(auditData.audit.updated_at || auditData.audit.created_at).toLocaleDateString()}.
                      </p>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)' }}>
                          <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ingredient</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Opening Stock</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Closing Stock</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Discrepancy (Usage)</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Closing Price</th>
                          <th style={{ padding: '12px 24px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Closing Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditData.items.map(item => {
                          const diff = (Number(item.closing_qty) || 0) - (Number(item.opening_qty) || 0)
                          const usageVal = diff * (Number(item.closing_cost) || 0)
                          
                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <td style={{ padding: '16px 24px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.ingredients?.name}</span>
                                <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>({item.ingredients?.unit})</span>
                              </td>
                              <td style={{ padding: '16px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {item.opening_qty} {item.ingredients?.unit}
                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-faint)' }}>@ ৳{item.opening_cost}</span>
                              </td>
                              <td style={{ padding: '16px 16px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>
                                {item.closing_qty} {item.ingredients?.unit}
                              </td>
                              <td style={{ padding: '16px 16px', textAlign: 'right', color: diff >= 0 ? '#10B981' : '#EF4444', fontWeight: 500 }}>
                                {diff > 0 ? '+' : ''}{diff} {item.ingredients?.unit}
                                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-faint)' }}>
                                  ৳{usageVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                              </td>
                              <td style={{ padding: '16px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                ৳{Number(item.closing_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 700 }}>
                                ৳{((Number(item.closing_qty) || 0) * (Number(item.closing_cost) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        )}
      </main>
    </div>
  )
}
