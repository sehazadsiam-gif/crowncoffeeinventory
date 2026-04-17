'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import dynamic from 'next/dynamic'
const DocumentScanner = dynamic(() => import('../../components/DocumentScanner'), { ssr: false })
import {
  Plus, Trash, Calendar, Save, CheckCircle2, ShoppingCart, X, Package
} from 'lucide-react'

export default function BazarPage() {
  const { addToast } = useToast()
  const [ingredients, setIngredients] = useState([])
  const [entries, setEntries] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([{ ingredient_id: '', quantity: '', cost_per_unit: '', total_cost: '', notes: '' }])
  const [scanSummary, setScanSummary] = useState(null)
  const [adjustment, setAdjustment] = useState({ ingredient_id: '', quantity: '', unit: 'gm' })
  const [adjusting, setAdjusting] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({})

  useEffect(() => { fetchIngredients() }, [])
  useEffect(() => { fetchEntries() }, [selectedDate])

  async function fetchIngredients() {
    const { data, error } = await supabase.from('ingredients').select('*').order('name')
    if (error) addToast(`Failed to load ingredients: ${error.message}`, 'error')
    setIngredients(data || [])
  }

  async function fetchEntries() {
    setLoading(true)
    const { data, error } = await supabase
      .from('bazar_entries')
      .select('*, ingredients(name, unit)')
      .eq('date', selectedDate)
      .order('created_at')
    if (error) addToast(`Failed to load records: ${error.message}`, 'error')
    setEntries(data || [])
    setLoading(false)
  }

  function updateRow(idx, field, value) {
    const updated = [...rows]
    updated[idx][field] = value
    const qty = parseFloat(updated[idx].quantity) || 0
    const rate = parseFloat(updated[idx].cost_per_unit) || 0
    const total = parseFloat(updated[idx].total_cost) || 0
    if (field === 'quantity' || field === 'cost_per_unit') {
      if (qty && rate) updated[idx].total_cost = (qty * rate).toFixed(2)
    } else if (field === 'total_cost') {
      if (qty && total) updated[idx].cost_per_unit = (total / qty).toFixed(2)
    }
    if (field === 'ingredient_id') {
      const ing = ingredients.find(i => i.id === value)
      if (ing && ing.cost_per_unit) {
        updated[idx].cost_per_unit = ing.cost_per_unit
        if (qty) updated[idx].total_cost = (qty * ing.cost_per_unit).toFixed(2)
      }
    }
    setRows(updated)
  }

  function addRow() {
    setRows([...rows, { ingredient_id: '', quantity: '', cost_per_unit: '', total_cost: '', notes: '' }])
  }

  function removeRow(idx) {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== idx))
    } else {
      setRows([{ ingredient_id: '', quantity: '', cost_per_unit: '', total_cost: '', notes: '' }])
    }
  }

  function handleScan(scannedItems) {
    const newRows = []
    let matchedCount = 0, unmatchedCount = 0
    scannedItems.forEach(item => {
      const match = ingredients.find(ing =>
        ing.name.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(ing.name.toLowerCase())
      )
      if (match) {
        matchedCount++
        newRows.push({ ingredient_id: match.id, quantity: item.quantity || '', cost_per_unit: item.cost_per_unit || match.cost_per_unit || '', notes: item.notes || '' })
      } else {
        unmatchedCount++
        newRows.push({ ingredient_id: '', quantity: item.quantity || '', cost_per_unit: item.cost_per_unit || '', notes: `(Unmatched: ${item.name}) ${item.notes || ''}`.trim() })
      }
    })
    setRows(newRows)
    setScanSummary({ matched: matchedCount, unmatched: unmatchedCount })
    addToast(`Scan complete: ${matchedCount} matched, ${unmatchedCount} unmatched.`, 'success')
  }

  async function saveBazar() {
    const valid = rows.filter(r => r.ingredient_id && r.quantity && r.cost_per_unit)
    if (valid.length === 0) return addToast('Please add at least one complete item', 'error')
    const inserts = valid.map(r => ({
      date: selectedDate,
      ingredient_id: r.ingredient_id,
      quantity: parseFloat(r.quantity),
      cost_per_unit: parseFloat(r.cost_per_unit),
      notes: r.notes,
    }))
    const { error } = await supabase.from('bazar_entries').insert(inserts)
    if (error) { addToast(error.message || 'Something went wrong', 'error'); return }
    setRows([{ ingredient_id: '', quantity: '', cost_per_unit: '', total_cost: '', notes: '' }])
    await fetchEntries()
    addToast(`Stock updated. ${valid.length} items added to bazar.`, 'success')
  }

  function confirmDeleteEntry(entry) {
    setModalConfig({
      title: 'Delete Bazar Entry',
      message: `Are you sure you want to remove this purchase of ${entry.quantity} ${entry.ingredients?.unit} ${entry.ingredients?.name}?`,
      onConfirm: () => deleteEntry(entry.id),
      confirmLabel: 'Delete Entry',
    })
    setModalOpen(true)
  }

  async function deleteEntry(id) {
    const { error } = await supabase.from('bazar_entries').delete().eq('id', id)
    if (error) { addToast(error.message || 'Something went wrong', 'error'); return }
    addToast('Entry removed successfully', 'success')
    fetchEntries()
  }

  async function saveAdjustment() {
    if (!adjustment.ingredient_id || !adjustment.quantity) return addToast('Please select an item and enter quantity', 'warning')
    setAdjusting(true)
    const convert = (val, from, to) => {
      if (!from || !to || from === to) return val
      if (from === 'gm' && to === 'kg') return val / 1000
      if (from === 'kg' && to === 'gm') return val * 1000
      if (from === 'ml' && to === 'ltr') return val / 1000
      if (from === 'ltr' && to === 'ml') return val * 1000
      return val
    }
    const ing = ingredients.find(i => i.id === adjustment.ingredient_id)
    const rawQty = parseFloat(adjustment.quantity)
    const normalizedQty = convert(rawQty, adjustment.unit, ing.unit)
    const { error } = await supabase.from('ingredients').update({ current_stock: normalizedQty }).eq('id', adjustment.ingredient_id)
    if (error) { addToast(error.message, 'error'); setAdjusting(false); return }
    await supabase.from('stock_movements').insert([{
      ingredient_id: adjustment.ingredient_id,
      movement_type: 'manual_adjust',
      quantity: normalizedQty,
      notes: `Initial stock setup: ${rawQty} ${adjustment.unit} (Normalized to ${normalizedQty} ${ing.unit})`
    }])
    addToast(`Stock level updated to ${normalizedQty} ${ing.unit}`, 'success')
    setAdjustment({ ingredient_id: '', quantity: '', unit: 'gm' })
    setAdjusting(false)
    fetchIngredients()
  }

  const runningTotal = rows.reduce((s, r) => s + (parseFloat(r.quantity) || 0) * (parseFloat(r.cost_per_unit) || 0), 0)
  const totalCost = entries.reduce((s, e) => s + (e.total_cost || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      <header style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', padding: '32px 0 24px' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 400, color: 'var(--text-primary)' }}>Daily Bazar</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '6px' }}>
            Log ingredient purchases and update stock
          </p>
          <div style={{ marginTop: '12px', width: '40px', height: '1px', background: 'var(--accent-gold)' }} />
        </div>
      </header>

      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <div className="instruction-box animate-in">
          Log everything you purchased today for Crown Coffee.
          Stock will be automatically updated and costs tracked for profit analysis.
          For pre-existing inventory, use the Initial Stock Setup section below.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '24px', alignItems: 'start' }} className="bazar-grid">

            {/* Main Entry */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <DocumentScanner onScanComplete={handleScan} scanType="bazar" />

              <div className="divider-label">Or enter manually below</div>

              <div className="card">
                {/* Header row: Date + Running Total */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <label className="label">
                      <Calendar size={11} style={{ display: 'inline', marginRight: '4px' }} />
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      className="input"
                      style={{ width: 'auto', fontWeight: 500, color: 'var(--accent-brown)' }}
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Running Total
                    </p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--accent-brown)' }}>
                      ৳{runningTotal.toLocaleString()}
                    </p>
                  </div>
                </div>

                {scanSummary && (
                  <div style={{
                    marginBottom: '16px', padding: '12px 14px',
                    background: 'var(--warning-bg)', border: '1px solid rgba(176,120,48,0.2)',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--warning)' }}>
                      AI Scan: {scanSummary.matched} items recognized, {scanSummary.unmatched} need manual matching
                    </p>
                    <button onClick={() => setScanSummary(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--warning)' }}>
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 2fr 2fr 2fr 40px', gap: '8px', padding: '0 4px 8px', marginBottom: '4px' }} className="hide-mobile">
                  {['Ingredient', 'Quantity', 'Total (৳)', 'Rate (৳)', 'Notes', ''].map((h, i) => (
                    <div key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rows.map((row, idx) => {
                    const unit = ingredients.find(i => i.id === row.ingredient_id)?.unit || ''
                    const isUnmatched = !row.ingredient_id && row.notes?.includes('Unmatched')
                    return (
                      <div key={idx} style={{
                        display: 'grid',
                        gridTemplateColumns: '3fr 2fr 2fr 2fr 2fr 40px',
                        gap: '8px',
                        alignItems: 'center',
                        padding: '8px',
                        borderRadius: '8px',
                        background: isUnmatched ? 'var(--warning-bg)' : 'transparent',
                        border: isUnmatched ? '1px solid rgba(176,120,48,0.2)' : '1px solid transparent',
                      }} className="bazar-row">
                        <select className="input" style={{ fontSize: '13px' }} value={row.ingredient_id} onChange={e => updateRow(idx, 'ingredient_id', e.target.value)}>
                          <option value="">Select item...</option>
                          {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                        <div style={{ position: 'relative' }}>
                          <input className="input" style={{ fontSize: '13px', paddingRight: unit ? '36px' : '14px' }} type="number" placeholder="Qty" value={row.quantity} onChange={e => updateRow(idx, 'quantity', e.target.value)} />
                          {unit && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{unit}</span>}
                        </div>
                        <input className="input" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)' }} type="number" placeholder="Total" value={row.total_cost} onChange={e => updateRow(idx, 'total_cost', e.target.value)} />
                        <div style={{ position: 'relative' }}>
                          <input className="input" style={{ fontSize: '12px', color: 'var(--text-muted)' }} type="number" placeholder="Rate" value={row.cost_per_unit} onChange={e => updateRow(idx, 'cost_per_unit', e.target.value)} />
                          {unit && <span style={{ position: 'absolute', top: '-9px', left: '8px', fontSize: '8px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', background: 'var(--bg-surface)', padding: '0 3px' }}>per {unit}</span>}
                        </div>
                        <input className="input" style={{ fontSize: '12px', fontStyle: 'italic' }} placeholder="Notes" value={row.notes} onChange={e => updateRow(idx, 'notes', e.target.value)} />
                        <button onClick={() => removeRow(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                          <Trash size={15} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
                  <button className="btn-secondary" onClick={addRow} style={{ flex: 1 }}>
                    <Plus size={14} /> Add Row
                  </button>
                  <button className="btn-primary" onClick={saveBazar} style={{ flex: 1 }}>
                    <Save size={14} /> Save & Update Stock
                  </button>
                </div>
              </div>
            </div>

            {/* Records Sidebar */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 200px)', position: 'sticky', top: '80px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Daily Records
                </h3>
                <span className="badge badge-green" style={{ fontFamily: 'var(--font-display)', fontSize: '14px', padding: '4px 10px' }}>৳{totalCost.toLocaleString()}</span>
              </div>

              {loading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="loader" />
                </div>
              ) : entries.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', opacity: 0.5 }}>
                  <ShoppingCart size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} strokeWidth={1} />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>No purchases logged today.</p>
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto' }} className="no-scrollbar">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {entries.map(e => (
                      <div key={e.id} style={{
                        padding: '12px 14px',
                        background: 'var(--bg-subtle)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-light)',
                        transition: 'border-color 0.15s ease',
                        position: 'relative',
                      }}
                        onMouseEnter={ev => ev.currentTarget.style.borderColor = 'var(--border-medium)'}
                        onMouseLeave={ev => ev.currentTarget.style.borderColor = 'var(--border-light)'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{e.ingredients?.name}</p>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {e.quantity} {e.ingredients?.unit} @ ৳{e.cost_per_unit}
                            </p>
                          </div>
                          <button onClick={() => confirmDeleteEntry(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-medium)', padding: '2px' }}>
                            <Trash size={13} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{e.notes || '—'}</span>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: 'var(--accent-brown)' }}>৳{e.total_cost?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', flexShrink: 0 }}>
                <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '14px 16px' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Total Investment
                  </p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700, color: 'var(--accent-brown)' }}>
                    ৳{totalCost.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Initial Stock Section */}
          <section style={{ marginTop: '16px' }}>
            <div className="divider" />
            <div className="card" style={{ borderLeft: '3px solid var(--warning)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--warning-bg)', borderRadius: '8px', padding: '10px', flexShrink: 0 }}>
                  <Package size={20} style={{ color: 'var(--warning)' }} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Initial Stock Setup
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Have items from before today? Set their current levels here.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
                <div>
                  <label className="label">Select Ingredient</label>
                  <select
                    className="input"
                    value={adjustment.ingredient_id}
                    onChange={e => setAdjustment({ ...adjustment, ingredient_id: e.target.value })}
                  >
                    <option value="">Choose item...</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.name} (Current: {ing.current_stock} {ing.unit})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Physical Stock Count</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      className="input"
                      style={{ flex: 1, fontWeight: 600 }}
                      placeholder="e.g. 500"
                      value={adjustment.quantity}
                      onChange={e => setAdjustment({ ...adjustment, quantity: e.target.value })}
                    />
                    <select
                      className="input"
                      style={{ width: '80px' }}
                      value={adjustment.unit}
                      onChange={e => setAdjustment({ ...adjustment, unit: e.target.value })}
                    >
                      <option value="gm">gm</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="ltr">ltr</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>
                  {adjustment.ingredient_id && (
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Tracked in: {ingredients.find(i => i.id === adjustment.ingredient_id)?.unit || '...'}
                    </p>
                  )}
                </div>
                <div>
                  <button
                    onClick={saveAdjustment}
                    disabled={adjusting}
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px' }}
                  >
                    {adjusting ? 'Updating...' : 'Initialize Stock Level'}
                  </button>
                </div>
              </div>

              <div style={{
                marginTop: '16px', padding: '12px 14px',
                background: 'var(--bg-subtle)', borderRadius: '8px',
                fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic',
              }}>
                This will directly set the ingredient level to the quantity you enter. Use this for your opening balance only.
              </div>
            </div>
          </section>
        </div>
      </main>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        {...modalConfig}
      />

      <style>{`
        @media (max-width: 768px) {
          .bazar-grid { grid-template-columns: 1fr !important; }
          .bazar-row { grid-template-columns: 1fr 1fr !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </div>
  )
}
