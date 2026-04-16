'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { 
  Package, AlertTriangle, CheckCircle, RefreshCcw, 
  Trash2, Info, ChevronDown, ChevronUp, History,
  TrendingDown, TrendingUp, Settings2, ShieldCheck
} from 'lucide-react'

export default function StockPage() {
  const { addToast } = useToast()
  const [stock, setStock] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [adjustForm, setAdjustForm] = useState({ method: 'add', quantity: '', reason: 'Restock' })

  useEffect(() => {
    fetchStock()
    fetchLogs()
  }, [])

  async function fetchStock() {
    const { data } = await supabase.from('ingredients').select('*').order('name')
    setStock(data || [])
    setLoading(false)
  }

  async function fetchLogs() {
    const { data } = await supabase
      .from('stock_logs')
      .select('*, ingredients(name, unit)')
      .order('created_at', { ascending: false })
      .limit(20)
    setLogs(data || [])
  }

  async function adjustStock(ingredientId) {
    if (!adjustForm.quantity || adjustForm.quantity <= 0) {
      return addToast('Please enter a valid quantity', 'error')
    }

    const { error } = await supabase.from('stock_logs').insert([{
      ingredient_id: ingredientId,
      change_amount: adjustForm.method === 'subtract' ? -parseFloat(adjustForm.quantity) : parseFloat(adjustForm.quantity),
      reason: adjustForm.reason,
      method: adjustForm.method, // 'add', 'subtract', 'set' - handles 'set' logic in DB or client? 
      // Assuming DB trigger handles simple +- from change_amount. 
      // For 'set', we might need to calculate the diff.
    }])

    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }

    addToast('Stock level updated successfully', 'success')
    setAdjustForm({ method: 'add', quantity: '', reason: 'Restock' })
    setExpanded(null)
    fetchStock()
    fetchLogs()
  }

  function getStatus(item) {
    if (item.current_stock <= 0) return { label: 'Out of Stock', color: 'bg-rose-100 text-rose-700 border-rose-200' }
    if (item.current_stock <= item.min_stock) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700 border-amber-200' }
    return { label: 'Healthy', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
  }

  return (
    <div className="min-h-screen bg-[var(--cafe-cream)] no-scrollbar">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        
        {/* Instruction Box */}
        <section className="instruction-box fade-in">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-2xl shrink-0">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Inventory and Stock</h2>
              <p className="text-white/80 text-sm max-w-2xl leading-relaxed">
                Monitor your current raw materials. Green labels mean you're well-stocked. 
                Red or Amber indicates it's time to visit the bazar.
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start fade-in">
          
          {/* Main Stock Table - Left */}
          <div className="lg:col-span-8 space-y-6">
            <div className="card-premium">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                <h3 className="font-bold text-[var(--cafe-brown)] uppercase text-xs tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[var(--cafe-gold)]" /> Live Inventory
                </h3>
                <RefreshCcw size={14} className="text-gray-400 cursor-pointer hover:rotate-180 transition-transform duration-500" onClick={fetchStock} />
              </div>

              {loading ? (
                <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-100 border-t-amber-900"></div></div>
              ) : stock.length === 0 ? (
                <div className="text-center py-20 grayscale opacity-40">
                  <Package size={48} className="mx-auto mb-4 text-[var(--cafe-brown)]" />
                  <p className="font-bold text-[var(--cafe-brown)]">Warehouse is empty.</p>
                  <p className="text-xs uppercase tracking-tighter mt-1">Add ingredients in the Menu page to see them here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stock.map(item => {
                    const status = getStatus(item)
                    const isExpanded = expanded === item.id
                    return (
                      <div key={item.id} className={`card p-0 transition-all duration-300 overflow-hidden ${isExpanded ? 'ring-2 ring-[var(--cafe-gold)] shadow-xl' : 'hover:border-[var(--cafe-gold-light)]'}`}>
                        <div 
                          className="p-5 flex items-center justify-between cursor-pointer group"
                          onClick={() => setExpanded(isExpanded ? null : item.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-[var(--cafe-brown)] text-white' : 'bg-gray-50 text-[var(--cafe-brown)] group-hover:bg-amber-50'}`}>
                              <Settings2 size={20} className={isExpanded ? 'animate-pulse' : ''} />
                            </div>
                            <div>
                              <p className="font-bold text-[var(--cafe-brown)] text-lg leading-tight">{item.name}</p>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mt-1">Min level: {item.min_stock} {item.unit}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-xl font-black text-[var(--cafe-brown)] leading-none">{item.current_stock} <span className="text-[10px] uppercase opacity-50">{item.unit}</span></p>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="text-gray-300 group-hover:text-[var(--cafe-gold)] transition-colors">
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Adjustment Form */}
                        {isExpanded && (
                          <div className="bg-[var(--cafe-cream)] p-6 border-t border-[var(--cafe-cream-dark)] fade-in">
                            <div className="flex items-center gap-2 mb-4">
                              <Info size={14} className="text-[var(--cafe-gold)]" />
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--cafe-brown)] opacity-70">Manual stock adjustment</h4>
                            </div>
                            
                            <div className="grid md:grid-cols-4 gap-4">
                              <div>
                                <label className="label uppercase text-[9px]">Method</label>
                                <select className="input text-sm bg-white border-transparent shadow-sm" value={adjustForm.method} onChange={e => setAdjustForm({ ...adjustForm, method: e.target.value })}>
                                  <option value="add">Add (+)</option>
                                  <option value="subtract">Subtract (-)</option>
                                  <option value="set">Set To (=)</option>
                                </select>
                              </div>
                              <div>
                                <label className="label uppercase text-[9px]">Amount ({item.unit})</label>
                                <input className="input text-sm bg-white border-transparent shadow-sm" type="number" placeholder="0" value={adjustForm.quantity} onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })} />
                              </div>
                              <div className="md:col-span-2">
                                <label className="label uppercase text-[9px]">Reason / Reference</label>
                                <div className="flex gap-2">
                                  <input className="input text-sm bg-white border-transparent shadow-sm flex-1" placeholder="e.g. Waste, Correction..." value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} />
                                  <button onClick={() => adjustStock(item.id)} className="btn-primary py-2.5 px-6 text-xs uppercase tracking-widest h-full">Update</button>
                                </div>
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

          {/* History Sidebar - Right */}
          <div className="lg:col-span-4 space-y-6">
            <div className="card h-[calc(100vh-250px)] flex flex-col no-scrollbar bg-white/50 border-dashed">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="font-black text-[var(--cafe-brown)] uppercase text-xs tracking-widest flex items-center gap-2">
                  <History size={14} className="text-[var(--cafe-gold)]" /> Stock History
                </h3>
              </div>

              {logs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4 grayscale opacity-30">
                  <RefreshCcw size={48} className="mb-4 text-[var(--cafe-brown)]" />
                  <p className="text-xs font-bold uppercase tracking-widest">No recent changes</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3">
                  {logs.map(log => (
                    <div key={log.id} className="p-4 bg-white rounded-2xl border border-gray-100 group">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-[var(--cafe-brown)] text-sm leading-tight">{log.ingredients?.name}</p>
                        <div className={`flex items-center gap-1 font-black text-xs ${log.change_amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {log.change_amount > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {log.change_amount > 0 ? '+' : ''}{log.change_amount} {log.ingredients?.unit}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[9px] uppercase font-black tracking-widest text-gray-400 mt-3 pt-3 border-t border-gray-50">
                        <span className="truncate max-w-[120px]">{log.reason}</span>
                        <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t border-gray-100 shrink-0 text-center">
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Showing last 20 operations</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
