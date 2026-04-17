'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import {
  Package, RefreshCcw, Info,
  ChevronDown, ChevronUp, History,
  TrendingDown, TrendingUp, Settings2, ShieldCheck
} from 'lucide-react'

export default function StockPage() {
  const { addToast } = useToast()
  const [stock, setStock] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [adjustForm, setAdjustForm] = useState({ method: 'add', quantity: '', reason: 'Restock' })
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchStock(); fetchLogs() }, [])

  async function fetchStock() {
    const { data } = await supabase.from('ingredients').select('*').order('name')
    setStock(data || [])
    setLoading(false)
  }

  async function fetchLogs() {
    const { data } = await supabase.from('stock_logs').select('*, ingredients(name, unit)').order('created_at', { ascending: false }).limit(20)
    setLogs(data || [])
  }

  async function adjustStock(ingredientId) {
    if (!adjustForm.quantity || adjustForm.quantity <= 0) return addToast('Please enter a valid quantity', 'error')
    const { error } = await supabase.from('stock_logs').insert([{
      ingredient_id: ingredientId,
      change_amount: adjustForm.method === 'subtract' ? -parseFloat(adjustForm.quantity) : parseFloat(adjustForm.quantity),
      reason: adjustForm.reason,
      method: adjustForm.method,
    }])
    if (error) { addToast(error.message || 'Something went wrong', 'error'); return }
    addToast('Stock level updated successfully', 'success')
    setAdjustForm({ method: 'add', quantity: '', reason: 'Restock' })
    setExpanded(null)
    fetchStock()
    fetchLogs()
  }

  function getStatus(item) {
    if (item.current_stock <= 0) return { label: 'Out of Stock', badge: 'badge-red', borderColor: 'var(--danger)', rowBg: 'rgba(166,60,60,0.03)' }
    if (item.current_stock <= item.min_stock) return { label: 'Low Stock', badge: 'badge-amber', borderColor: 'var(--warning)', rowBg: 'var(--warning-bg)' }
    return { label: 'In Stock', badge: 'badge-green', borderColor: 'var(--success)', rowBg: 'transparent' }
  }

  const filterPills = [
    { key: 'all', label: 'All Items' },
    { key: 'low', label: 'Low Stock' },
    { key: 'out', label: 'Out of Stock' },
  ]

  const filteredStock = stock.filter(item => {
    if (filter === 'low') return item.current_stock > 0 && item.current_stock <= item.min_stock
    if (filter === 'out') return item.current_stock <= 0
    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      <header style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', padding: '32px 0 24px' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 400, color: 'var(--text-primary)' }}>Stock Manager</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '6px' }}>
            Live inventory levels and adjustment history
          </p>
          <div style={{ marginTop: '12px', width: '40px', height: '1px', background: 'var(--accent-gold)' }} />
        </div>
      </header>

      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <div className="instruction-box animate-in">
          Monitor your current raw materials. Green labels mean you are well-stocked.
          Amber or Red means it is time to visit the bazar. Click any item to make manual adjustments.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '24px', alignItems: 'start' }} className="stock-grid">

          {/* Main Stock Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {filterPills.map(p => (
                <button
                  key={p.key}
                  onClick={() => setFilter(p.key)}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: `1px solid ${filter === p.key ? 'var(--accent-brown)' : 'var(--border-medium)'}`,
                    background: filter === p.key ? 'var(--accent-brown)' : 'transparent',
                    color: filter === p.key ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={fetchStock}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-body)', fontSize: '11px', padding: '6px 10px', borderRadius: '6px', transition: 'all 0.2s ease' }}
              >
                <RefreshCcw size={13} /> Refresh
              </button>
            </div>

            <div className="card animate-in" style={{ padding: '0', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}><div className="loader" /></div>
              ) : filteredStock.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                  <Package size={36} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} strokeWidth={1} />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)' }}>No items found for this filter.</p>
                </div>
              ) : (
                <div>
                  {filteredStock.map((item, idx) => {
                    const status = getStatus(item)
                    const isExpanded = expanded === item.id
                    return (
                      <div key={item.id} style={{ borderBottom: idx < filteredStock.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                        <div
                          style={{
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            background: isExpanded ? 'var(--bg-subtle)' : status.rowBg,
                            borderLeft: `3px solid ${status.borderColor}`,
                            transition: 'background 0.15s ease',
                          }}
                          onClick={() => setExpanded(isExpanded ? null : item.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <Settings2 size={16} style={{ color: isExpanded ? 'var(--accent-brown)' : 'var(--text-muted)', flexShrink: 0 }} strokeWidth={1.5} />
                            <div>
                              <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</p>
                              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Min level: {item.min_stock} {item.unit}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--accent-brown)' }}>
                                {item.current_stock}
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px', textTransform: 'uppercase' }}>{item.unit}</span>
                              </p>
                              <span className={`badge ${status.badge}`} style={{ marginTop: '4px', display: 'inline-block' }}>{status.label}</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)' }}>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ background: 'var(--bg-subtle)', padding: '16px 20px', borderLeft: `3px solid ${status.borderColor}` }} className="animate-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                              <Info size={13} style={{ color: 'var(--accent-gold)' }} />
                              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                Manual Stock Adjustment
                              </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', alignItems: 'end' }}>
                              <div>
                                <label className="label">Method</label>
                                <select className="input" style={{ background: 'var(--bg-surface)' }} value={adjustForm.method} onChange={e => setAdjustForm({ ...adjustForm, method: e.target.value })}>
                                  <option value="add">Add (+)</option>
                                  <option value="subtract">Subtract (-)</option>
                                  <option value="set">Set To (=)</option>
                                </select>
                              </div>
                              <div>
                                <label className="label">Amount ({item.unit})</label>
                                <input className="input" style={{ background: 'var(--bg-surface)' }} type="number" placeholder="0" value={adjustForm.quantity} onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })} />
                              </div>
                              <div>
                                <label className="label">Reason / Reference</label>
                                <input className="input" style={{ background: 'var(--bg-surface)' }} placeholder="e.g. Waste, Correction..." value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} />
                              </div>
                              <div>
                                <button onClick={() => adjustStock(item.id)} className="btn-primary" style={{ width: '100%', padding: '10px' }}>
                                  Update
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* History Sidebar */}
          <div className="card animate-in" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 200px)', position: 'sticky', top: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Stock History</h3>
              <History size={15} style={{ color: 'var(--accent-gold)' }} strokeWidth={1.5} />
            </div>

            {logs.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.4 }}>
                <RefreshCcw size={28} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} strokeWidth={1} />
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>No recent changes</p>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', position: 'relative', paddingLeft: '16px' }} className="no-scrollbar">
                {/* Timeline vertical line */}
                <div style={{ position: 'absolute', left: '6px', top: 0, bottom: 0, width: '1px', background: 'var(--border-medium)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {logs.map(log => (
                    <div key={log.id} style={{ position: 'relative' }}>
                      {/* Timeline dot */}
                      <div style={{
                        position: 'absolute',
                        left: '-19px',
                        top: '12px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: log.change_amount > 0 ? 'var(--success)' : 'var(--danger)',
                        border: '2px solid var(--bg-surface)',
                      }} />
                      <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{log.ingredients?.name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: log.change_amount > 0 ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700 }}>
                            {log.change_amount > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {log.change_amount > 0 ? '+' : ''}{log.change_amount} {log.ingredients?.unit}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--border-light)' }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.reason}</span>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)' }}>
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-light)', flexShrink: 0, textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Showing last 20 operations
              </p>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .stock-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
