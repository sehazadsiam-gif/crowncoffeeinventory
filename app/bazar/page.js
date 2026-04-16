'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import dynamic from 'next/dynamic'
const DocumentScanner = dynamic(() => import('../../components/DocumentScanner'), { ssr: false })
import { 
  Plus, Trash2, ShoppingBag, Info, Calendar, 
  Trash, Calculator, Save, CheckCircle2, ShoppingCart, X, Package
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

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({})

  useEffect(() => { fetchIngredients() }, [])
  useEffect(() => { fetchEntries() }, [selectedDate])

  async function fetchIngredients() {
    const { data, error } = await supabase.from('ingredients').select('*').order('name')
    if (error) {
      console.error("fetchIngredients error:", error)
      addToast(`Failed to load ingredients: ${error.message}`, "error")
    }
    setIngredients(data || [])
  }

  async function fetchEntries() {
    setLoading(true)
    const { data, error } = await supabase
      .from('bazar_entries')
      .select('*, ingredients(name, unit)')
      .eq('date', selectedDate)
      .order('created_at')
    
    if (error) {
      console.error("fetchEntries error:", error)
      addToast(`Failed to load records: ${error.message}`, "error")
    }
    setEntries(data || [])
    setLoading(false)
  }

  function updateRow(idx, field, value) {
    const updated = [...rows]
    updated[idx][field] = value
    
    const qty = parseFloat(updated[idx].quantity) || 0
    const rate = parseFloat(updated[idx].cost_per_unit) || 0
    const total = parseFloat(updated[idx].total_cost) || 0

    // Auto-calculate logic
    if (field === 'quantity' || field === 'cost_per_unit') {
      if (qty && rate) updated[idx].total_cost = (qty * rate).toFixed(2)
    } else if (field === 'total_cost') {
      if (qty && total) updated[idx].cost_per_unit = (total / qty).toFixed(2)
    }

    // Auto-fill last known price
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
    setRows([...rows, { ingredient_id: '', quantity: '', cost_per_unit: '', notes: '' }])
  }

  function removeRow(idx) {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== idx))
    } else {
      setRows([{ ingredient_id: '', quantity: '', cost_per_unit: '', notes: '' }])
    }
  }

  function handleScan(scannedItems) {
    const newRows = []
    let matchedCount = 0
    let unmatchedCount = 0

    scannedItems.forEach(item => {
      // Case-insensitive partial matching
      const match = ingredients.find(ing => 
        ing.name.toLowerCase().includes(item.name.toLowerCase()) || 
        item.name.toLowerCase().includes(ing.name.toLowerCase())
      )

      if (match) {
        matchedCount++
        newRows.push({
          ingredient_id: match.id,
          quantity: item.quantity || '',
          cost_per_unit: item.cost_per_unit || match.cost_per_unit || '',
          notes: item.notes || ''
        })
      } else {
        unmatchedCount++
        newRows.push({
          ingredient_id: '',
          quantity: item.quantity || '',
          cost_per_unit: item.cost_per_unit || '',
          notes: `(Unmatched: ${item.name}) ${item.notes || ''}`.trim()
        })
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
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }

    setRows([{ ingredient_id: '', quantity: '', cost_per_unit: '', notes: '' }])
    await fetchEntries()
    addToast(`Stock updated. ${valid.length} items added to bazar.`, 'success')
  }

  function confirmDeleteEntry(entry) {
    setModalConfig({
      title: 'Delete Bazar Entry',
      message: `Are you sure you want to remove this purchase of ${entry.quantity} ${entry.ingredients?.unit} ${entry.ingredients?.name}? Note: Stock levels will NOT be automatically corrected.`,
      onConfirm: () => deleteEntry(entry.id),
      confirmLabel: 'Delete Entry',
    })
    setModalOpen(true)
  }

  async function deleteEntry(id) {
    const { error } = await supabase.from('bazar_entries').delete().eq('id', id)
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }
    addToast('Entry removed successfully', 'success')
    fetchEntries()
  }

  async function saveAdjustment() {
    if (!adjustment.ingredient_id || !adjustment.quantity) {
      return addToast('Please select an item and enter quantity', 'warning')
    }

    setAdjusting(true)
    
    // Client-side conversion logic
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

    const { error } = await supabase
      .from('ingredients')
      .update({ current_stock: normalizedQty })
      .eq('id', adjustment.ingredient_id)

    if (error) {
      addToast(error.message, 'error')
      setAdjusting(false)
      return
    }

    // Record the movement
    await supabase.from('stock_movements').insert([{
      ingredient_id: adjustment.ingredient_id,
      movement_type: 'manual_adjust',
      quantity: normalizedQty,
      notes: `Initial stock setup: ${rawQty} ${adjustment.unit} (Normalized to ${normalizedQty} ${ing.unit})`
    }])

    addToast(`Stock level updated to ${normalizedQty} ${ing.unit}`, 'success')
    setAdjustment({ ingredient_id: '', quantity: '', unit: 'gm' })
    setAdjusting(false)
    fetchIngredients() // Refresh local list
  }

  const runningTotal = rows.reduce((s, r) => s + (parseFloat(r.quantity) || 0) * (parseFloat(r.cost_per_unit) || 0), 0)
  const totalCost = entries.reduce((s, e) => s + (e.total_cost || 0), 0)

  return (
    <div className="min-h-screen bg-[var(--cafe-cream)] no-scrollbar">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        
        {/* Instruction Box */}
        <section className="instruction-box fade-in">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-2xl shrink-0">
              <ShoppingCart size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Daily Bazar Log</h2>
              <p className="text-white/80 text-sm max-w-2xl leading-relaxed">
                Log everything you bought today for Crown Coffee. 
                This will automatically add to your stock and calculate costs for profit analysis.
              </p>
              <p className="mt-3 text-[10px] font-bold text-amber-200 uppercase tracking-widest flex items-center gap-1">
                Tip: Have items from before today? Add them as "Opening Stock" in the Menu page.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start fade-in">
          
          {/* Main Log Entry - Left/Top */}
          <div className="lg:col-span-8 space-y-6">
            <DocumentScanner onScanComplete={handleScan} scanType="bazar" />
            
            <div className="flex items-center gap-4 my-8">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">Or enter manually below</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>

            <div className="card-premium">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-gray-100 pb-6">
                <div>
                  <h3 className="font-bold text-[var(--cafe-brown)] uppercase text-xs tracking-widest mb-1 flex items-center gap-2">
                    <Calendar size={14} className="text-[var(--cafe-gold)]" /> Purchase Date
                  </h3>
                  <div className="relative group">
                    <input
                      type="date"
                      className="input w-full md:w-auto font-bold text-[var(--cafe-brown)]"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Running Total</p>
                  <p className="text-3xl font-black text-emerald-600 tracking-tighter">৳{runningTotal.toLocaleString()}</p>
                </div>
              </div>

              {scanSummary && (
                <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                  <p className="text-xs font-bold text-amber-800">
                    AI Scan: {scanSummary.matched} items recognized, {scanSummary.unmatched} need manual matching
                  </p>
                  <button onClick={() => setScanSummary(null)} className="text-amber-800/50 hover:text-amber-800">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Dynamic Rows */}
              <div className="space-y-4">
                <div className="hidden md:grid grid-cols-12 gap-3 px-2 mb-2">
                  <div className="col-span-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Ingredient</div>
                  <div className="col-span-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">Quantity</div>
                  <div className="col-span-2 text-[10px] font-black uppercase text-gray-400 tracking-widest text-emerald-600">Total Price (৳)</div>
                  <div className="col-span-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">Rate (৳)</div>
                  <div className="col-span-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">Notes</div>
                </div>

                {rows.map((row, idx) => {
                  const unit = ingredients.find(i => i.id === row.ingredient_id)?.unit || ''
                  return (
                    <div key={idx} className={`grid grid-cols-12 gap-2 md:gap-3 items-center group/row p-1 rounded-xl transition-colors ${!row.ingredient_id && row.notes.includes('Unmatched') ? 'bg-amber-100/50 border border-amber-200' : 'hover:bg-gray-50'}`}>
                      <div className="col-span-12 md:col-span-4">
                        <select className="input text-sm font-bold" value={row.ingredient_id} onChange={e => updateRow(idx, 'ingredient_id', e.target.value)}>
                          <option value="">Select item...</option>
                          {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-6 md:col-span-2 relative">
                        <input className="input text-sm pr-10" type="number" placeholder="Qty" value={row.quantity} onChange={e => updateRow(idx, 'quantity', e.target.value)} />
                        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">{unit}</span>}
                      </div>
                      <div className="col-span-6 md:col-span-2 group-hover/row:scale-[1.02] transition-transform">
                        <input className="input text-sm border-emerald-100 bg-emerald-50/10 font-black text-emerald-700" type="number" placeholder="Total" value={row.total_cost} onChange={e => updateRow(idx, 'total_cost', e.target.value)} />
                      </div>
                      <div className="col-span-6 md:col-span-2 relative">
                        <input className="input text-[10px] opacity-70" type="number" placeholder="Rate" value={row.cost_per_unit} onChange={e => updateRow(idx, 'cost_per_unit', e.target.value)} />
                        {unit && <span className="absolute -top-3 left-1 text-[7px] font-black text-gray-400 uppercase bg-white px-1 tracking-tighter">per {unit}</span>}
                      </div>
                      <div className="col-span-10 md:col-span-2">
                        <input className="input text-xs italic opacity-60" placeholder="Notes" value={row.notes} onChange={e => updateRow(idx, 'notes', e.target.value)} />
                      </div>
                      <div className="col-span-2 md:col-span-1 flex justify-center">
                        <button onClick={() => removeRow(idx)} className="text-gray-300 hover:text-rose-500 transition-all p-1">
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-col md:flex-row gap-4 mt-8 pt-6 border-t border-gray-100">
                <button onClick={addRow} className="btn-secondary py-3 text-xs uppercase tracking-widest flex-1">
                  <Plus size={14} /> Add Another Item
                </button>
                <button onClick={saveBazar} className="btn-primary py-3 text-xs uppercase tracking-widest flex-1">
                  <Save size={14} /> Save & Update Stock
                </button>
              </div>
            </div>
          </div>

          {/* Records Sidebar - Right/Bottom */}
          <div className="lg:col-span-4 space-y-6">
            <div className="card h-[calc(100vh-250px)] flex flex-col no-scrollbar">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="font-bold text-[var(--cafe-brown)] uppercase text-xs tracking-widest flex items-center gap-2">
                  <Calculator size={14} className="text-[var(--cafe-gold)]" /> Daily Records
                </h3>
                <span className="badge-green font-black">৳{totalCost.toLocaleString()}</span>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-100 border-t-amber-900"></div></div>
              ) : entries.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4 grayscale opacity-40">
                  <ShoppingBag size={48} className="mb-4 text-[var(--cafe-brown)]" />
                  <p className="text-sm font-bold text-[var(--cafe-brown)]">No purchases logged today.</p>
                  <p className="text-[10px] uppercase tracking-tighter mt-1">Add your first item to start tracking.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3">
                  {entries.map(e => (
                    <div key={e.id} className="p-4 bg-[var(--cafe-cream)] rounded-2xl border border-[var(--cafe-cream-dark)] group transition-all hover:border-[var(--cafe-gold-light)]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-[var(--cafe-brown)] leading-tight">{e.ingredients?.name}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter mt-1">
                            {e.quantity} {e.ingredients?.unit} @ ৳{e.cost_per_unit}
                          </p>
                        </div>
                        <button onClick={() => confirmDeleteEntry(e)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all">
                          <Trash size={14} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/50">
                        <span className="text-[10px] text-gray-400 italic italic tracking-tight truncate max-w-[120px]">{e.notes || '—'}</span>
                        <span className="font-black text-emerald-600">৳{e.total_cost?.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t border-gray-100 shrink-0">
                <div className="bg-[var(--cafe-brown)] text-white p-4 rounded-xl shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-1">Total Investment</p>
                    <p className="text-2xl font-black">৳{totalCost.toLocaleString()}</p>
                  </div>
                  <CheckCircle2 className="absolute -bottom-2 -right-2 text-white/10 w-16 h-16 rotate-12" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Initial Stock Section - NEW */}
        <section className="mt-12 pt-12 border-t-2 border-dashed border-gray-200 fade-in">
          <div className="card-premium border-amber-200 bg-amber-50/20">
            <div className="flex items-start gap-4 mb-8">
              <div className="bg-amber-100 p-3 rounded-2xl text-amber-600 shrink-0">
                <Package size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-amber-900 uppercase tracking-tighter">📦 Initial Stock Setup</h3>
                <p className="text-amber-800/60 text-xs font-bold uppercase tracking-widest mt-1">Have items from before today? Initialize them here.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 items-end">
              <div className="md:col-span-1">
                <label className="label text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2">Select Ingredient</label>
                <select 
                  className="input bg-white border-amber-100 focus:ring-amber-500 font-bold"
                  value={adjustment.ingredient_id}
                  onChange={e => setAdjustment({ ...adjustment, ingredient_id: e.target.value })}
                >
                  <option value="">Choose item...</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} (Current: {ing.current_stock} {ing.unit})</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="label text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2">Current Physical Stock</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    className="input flex-1 bg-white border-amber-100 focus:ring-amber-500 font-black"
                    placeholder="e.g. 500"
                    value={adjustment.quantity}
                    onChange={e => setAdjustment({ ...adjustment, quantity: e.target.value })}
                  />
                  <select 
                    className="input w-24 bg-white border-amber-100 focus:ring-amber-500 font-bold text-[10px]"
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
                <p className="mt-1 text-[8px] text-amber-700/50 uppercase font-black tracking-tighter">
                   Item is tracked in: <span className="text-amber-900">{ingredients.find(i => i.id === adjustment.ingredient_id)?.unit || '...'}</span>
                </p>
              </div>
              <div className="md:col-span-1">
                <button 
                  onClick={saveAdjustment}
                  disabled={adjusting}
                  className="btn-primary bg-amber-600 hover:bg-amber-700 w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg disabled:opacity-50"
                >
                  {adjusting ? 'Updating...' : 'Initialize Stock Level'}
                </button>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white/50 rounded-2xl border border-amber-100 text-[10px] text-amber-800 font-bold italic">
              * This will directly set the ingredient's level to the quantity you enter. Use this for your opening balance.
            </div>
          </div>
        </section>
      </main>

      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        {...modalConfig}
      />
    </div>
  )
}
