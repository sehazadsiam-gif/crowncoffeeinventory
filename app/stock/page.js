'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import {
  Package, RefreshCcw, Info,
  ChevronDown, ChevronUp, History,
  TrendingDown, TrendingUp, Settings2, Calendar
} from 'lucide-react'

export default function StockPage() {
  const { addToast } = useToast()
  const [stock, setStock] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [adjustForm, setAdjustForm] = useState({ method: 'add', quantity: '', reason: 'Restock' })
  const [filter, setFilter] = useState('all')
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => { fetchStock(); }, [])
  useEffect(() => { fetchLogs(logDate) }, [logDate])

  async function fetchStock() {
    setLoading(true)
    const { data } = await supabase.from('ingredients').select('*').order('name')
    setStock(data || [])
    setLoading(false)
  }

  async function fetchLogs(selectedDate) {
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const { data } = await supabase.from('stock_logs')
      .select('*, ingredients(name, unit)')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false })
      .limit(50)
      
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
    fetchLogs(logDate)
  }

  function getStatus(item) {
    if (item.current_stock <= 0) return { label: 'Out of Stock', badge: 'badge-red', borderColor: 'var(--danger)', rowBg: 'var(--danger-bg)' }
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
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Stock Manager</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Live inventory levels and daily adjustment history
        </p>

        <div className="instruction-box">
          Monitor your current raw materials. Click any item to make manual adjustments.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '24px', alignItems: 'start' }} className="stock-grid">

          {/* Main Stock Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {filterPills.map(p => (
                <button
                  key={p.key}
                  onClick={() => setFilter(p.key)}
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: `1px solid ${filter === p.key ? 'var(--primary)' : 'var(--border-medium)'}`,
                    background: filter === p.key ? 'var(--primary)' : 'var(--bg-surface)',
                    color: filter === p.key ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={fetchStock}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '6px 10px', borderRadius: '6px' }}
              >
                <RefreshCcw size={14} /> Refresh
              </button>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}><div className="loader" /></div>
              ) : filteredStock.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                  <Package size={36} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} strokeWidth={1.5} />
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No items found for this filter.</p>
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
                            borderLeft: `4px solid ${status.borderColor}`,
                            transition: 'background 0.15s ease',
                          }}
                          onClick={() => setExpanded(isExpanded ? null : item.id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <Settings2 size={18} style={{ color: isExpanded ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                            <div>
                              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</p>
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Min level: {item.min_stock} {item.unit}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {item.current_stock}
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '4px' }}>{item.unit}</span>
                              </p>
                              <span className={`badge ${status.badge}`} style={{ marginTop: '4px' }}>{status.label}</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)' }}>
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div style={{ background: 'var(--bg-subtle)', padding: '16px 20px', borderLeft: `4px solid ${status.borderColor}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                              <Info size={14} style={{ color: 'var(--primary)' }} />
                              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                Manual Stock Adjustment
                              </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', alignItems: 'end' }}>
                              <div>
                                <label className="label">Method</label>
                                <select className="input" value={adjustForm.method} onChange={e => setAdjustForm({ ...adjustForm, method: e.target.value })}>
                                  <option value="add">Add (+)</option>
                                  <option value="subtract">Subtract (-)</option>
                                  <option value="set">Set To (=)</option>
                                </select>
                              </div>
                              <div>
                                <label className="label">Amount ({item.unit})</label>
                                <input className="input" type="number" placeholder="0" value={adjustForm.quantity} onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })} />
                              </div>
                              <div>
                                <label className="label">Reason</label>
                                <input className="input" placeholder="e.g. Waste, Correction..." value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} />
                              </div>
                              <div>
                                <button onClick={() => adjustStock(item.id)} className="btn-primary" style={{ width: '100%', padding: '9px 12px' }}>
                                  Update Stock
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
          <div className="card" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 100px)', position: 'sticky', top: '80px', padding: '0' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={16} style={{ color: 'var(--primary)' }} /> Stock History
                </h3>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-medium)' }}>
                <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="date" 
                  value={logDate} 
                  onChange={(e) => setLogDate(e.target.value)}
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', width: '100%' }}
                />
              </div>
            </div>

            {logs.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.6 }}>
                <RefreshCcw size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No changes recorded on this date.</p>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }} className="no-scrollbar">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {logs.map(log => (
                    <div key={log.id} style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{log.ingredients?.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: log.change_amount > 0 ? 'var(--success)' : 'var(--danger)', fontSize: '13px', fontWeight: 600 }}>
                          {log.change_amount > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {log.change_amount > 0 ? '+' : ''}{log.change_amount} {log.ingredients?.unit}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--bg-hover)' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.reason}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
