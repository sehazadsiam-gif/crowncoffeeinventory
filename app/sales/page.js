'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import Link from 'next/link'
import ImageScanner from '../../components/ImageScanner'
import { 
  ShoppingCart, CheckCircle, Trash2, Info, 
  Plus, Minus, Receipt, ArrowRight, Package,
  TrendingUp, Layers, CheckCircle2, X
} from 'lucide-react'

export default function SalesPage() {
  const { addToast } = useToast()
  const [menuItems, setMenuItems] = useState([])
  const [sales, setSales] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [cart, setCart] = useState({}) // { menu_item_id: { qty, price } }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState([]) // ingredient deductions preview
  const [unrecognized, setUnrecognized] = useState([])
  const menuGridRef = useRef(null)

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({})

  useEffect(() => { fetchMenu() }, [])
  useEffect(() => { fetchSales() }, [selectedDate])
  useEffect(() => { computePreview() }, [cart])

  const handleScan = (scannedItems) => {
    const newCart = { ...cart }
    const unknown = []
    
    scannedItems.forEach(item => {
      const match = menuItems.find(mi => 
        mi.name.toLowerCase().includes(item.name.toLowerCase()) || 
        item.name.toLowerCase().includes(mi.name.toLowerCase())
      )
      
      if (match) {
        const existing = newCart[match.id] || { qty: 0, price: match.selling_price }
        newCart[match.id] = {
          qty: existing.qty + (item.quantity || 0),
          price: item.price || existing.price
        }
      } else {
        unknown.push(item.name)
      }
    })
    
    setCart(newCart)
    setUnrecognized(unknown)
    
    if (menuGridRef.current) {
      menuGridRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    
    addToast(unknown.length > 0 ? `Scan processed with ${unknown.length} unrecognized items.` : 'Scan successful! All items matched.', unknown.length > 0 ? 'warning' : 'success')
  }

  async function fetchMenu() {
    const { data } = await supabase
      .from('menu_items')
      .select('*, recipes(quantity, ingredients(name, unit))')
      .eq('is_active', true)
      .order('category')
    setMenuItems(data || [])
  }

  async function fetchSales() {
    setLoading(true)
    const { data } = await supabase
      .from('sales')
      .select('*, menu_items(name, selling_price, category)')
      .eq('date', selectedDate)
      .order('created_at')
    setSales(data || [])
    setLoading(false)
  }

  function setQty(id, qty) {
    const n = parseInt(qty) || 0
    if (n <= 0) {
      const c = { ...cart }
      delete c[id]
      setCart(c)
    } else {
      const item = menuItems.find(m => m.id === id)
      setCart({ ...cart, [id]: { qty: n, price: cart[id]?.price || item?.selling_price || 0 } })
    }
  }

  function setPrice(id, price) {
    const p = parseFloat(price) || 0
    if (cart[id]) {
      setCart({ ...cart, [id]: { ...cart[id], price: p } })
    }
  }

  function computePreview() {
    const deductions = {}
    for (const [menuItemId, data] of Object.entries(cart)) {
      const { qty } = data
      const item = menuItems.find(m => m.id === menuItemId)
      if (!item) continue
      for (const r of item.recipes || []) {
        const key = r.ingredients.name
        deductions[key] = (deductions[key] || 0) + r.quantity * qty
        deductions[`${key}__unit`] = r.ingredients.unit
      }
    }
    const result = Object.entries(deductions)
      .filter(([k]) => !k.endsWith('__unit'))
      .map(([name, qty]) => ({ name, qty: qty.toFixed(1), unit: deductions[`${name}__unit`] }))
    setPreview(result)
  }

  async function submitSales() {
    const entries = Object.entries(cart).filter(([, data]) => data.qty > 0)
    if (entries.length === 0) return addToast('Please add items to your cart', 'error')
    
    setSaving(true)
    const inserts = entries.map(([menu_item_id, data]) => ({
      date: selectedDate,
      menu_item_id,
      quantity: data.qty,
      total_revenue: data.qty * data.price
    }))

    const { error } = await supabase.from('sales').insert(inserts)
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      setSaving(false)
      return
    }

    setCart({})
    await fetchSales()
    setSaving(false)
    addToast('Sales recorded. Stock has been deducted based on recipes.', 'success')
  }

  function confirmDeleteSale(sale) {
    setModalConfig({
      title: 'Delete Sale Record',
      message: `Are you sure you want to remove the sale of ${sale.quantity}x ${sale.menu_items?.name}? Note: Stock levels will NOT be automatically corrected.`,
      onConfirm: () => deleteSale(sale.id),
      confirmLabel: 'Delete Record',
    })
    setModalOpen(true)
  }

  async function deleteSale(id) {
    const { error } = await supabase.from('sales').delete().eq('id', id)
    if (error) {
      console.error("Supabase error:", error)
      addToast(error.message || "Something went wrong", "error")
      return
    }
    addToast('Sale record removed', 'success')
    fetchSales()
  }

  const totalRevenue = sales.reduce((s, e) => s + (e.total_revenue || 0), 0)
  const totalQty = sales.reduce((s, e) => s + (e.quantity || 0), 0)
  const cartTotal = Object.entries(cart).reduce((s, [id, data]) => {
    return s + (data.qty * data.price)
  }, 0)

  // Group by category
  const grouped = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

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
              <h2 className="text-xl font-bold mb-1">Record Daily Sales</h2>
              <p className="text-white/80 text-sm max-w-2xl leading-relaxed">
                Enter how many of each item you sold today at Crown Coffee. 
                Stock will be automatically deducted based on your defined recipes.
              </p>
            </div>
          </div>
        </section>

        {menuItems.length === 0 ? (
          <div className="card text-center py-20 fade-in">
            <Layers size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-bold text-[var(--cafe-brown)]">No menu items found.</p>
            <p className="text-sm text-gray-500 mb-6">You need to add items in the Menu page before recording sales.</p>
            <Link href="/menu" className="btn-primary inline-flex">Go to Menu Page</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start fade-in">
            
            {/* Menu Selection - Left/Top */}
            <div className="lg:col-span-8 space-y-8">
              <ImageScanner 
                onScanComplete={handleScan} 
                scanType="sales" 
                menuItems={menuItems.map(m => m.name)} 
              />

              {unrecognized.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-rose-800 font-bold text-sm flex items-center gap-2">
                      <Info size={16} /> These items were not recognized:
                    </h4>
                    <button onClick={() => setUnrecognized([])} className="text-rose-400 hover:text-rose-600 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                  <ul className="list-disc list-inside space-y-1 mb-4">
                    {unrecognized.map((name, i) => (
                      <li key={i} className="text-xs font-bold text-rose-700">{name}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Please add them manually below</p>
                </div>
              )}

              <div className="flex items-center gap-4 my-8">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">Or select manually below</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>

              <div ref={menuGridRef} className="flex items-center justify-between gap-4 border-b border-gray-100 pb-6 px-1">
                <div>
                  <h3 className="font-bold text-[var(--cafe-brown)] uppercase text-xs tracking-widest mb-1 flex items-center gap-2">
                    <Receipt size={14} className="text-[var(--cafe-gold)]" /> Sales Date
                  </h3>
                  <input type="date" className="input w-full md:w-auto font-bold text-[var(--cafe-brown)]" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">Current total</p>
                  <p className="text-3xl font-black text-emerald-600 tracking-tighter">৳{cartTotal.toLocaleString()}</p>
                </div>
              </div>

              <div className="grid gap-8">
                {Object.entries(grouped).map(([category, items]) => (
                  <section key={category}>
                    <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest mb-4 ml-1 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--cafe-gold)]" /> {category}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {items.map(item => (
                        <div key={item.id} className={`card p-5 group transition-all duration-300 ${cart[item.id]?.qty > 0 ? 'border-[var(--cafe-gold)] bg-amber-50/20 ring-1 ring-[var(--cafe-gold)]' : 'hover:border-[var(--cafe-cream-dark)]'}`}>
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-bold text-[var(--cafe-brown)] text-lg leading-tight">{item.name}</p>
                                <p className="text-emerald-600 font-black text-sm mt-1 flex items-center gap-1">
                                  ৳{item.selling_price} 
                                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Default</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
                                <button
                                  onClick={() => setQty(item.id, (cart[item.id]?.qty || 0) - 1)}
                                  className="w-9 h-9 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors flex items-center justify-center text-gray-400"
                                ><Minus size={18} /></button>
                                <input
                                  type="number"
                                  className="w-12 text-center font-bold text-[var(--cafe-brown)] focus:outline-none bg-transparent"
                                  value={cart[item.id]?.qty || ''}
                                  onChange={e => setQty(item.id, e.target.value)}
                                  placeholder="0"
                                />
                                <button
                                  onClick={() => setQty(item.id, (cart[item.id]?.qty || 0) + 1)}
                                  className="w-9 h-9 rounded-lg hover:bg-emerald-50 hover:text-emerald-500 transition-colors flex items-center justify-center text-gray-400"
                                ><Plus size={18} /></button>
                              </div>
                            </div>

                            {cart[item.id]?.qty > 0 && (
                              <div className="pt-3 border-t border-amber-100 flex items-center justify-between">
                                <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Selling Price (৳)</span>
                                <input 
                                  type="number"
                                  className="w-24 text-right font-black text-emerald-600 bg-white rounded-lg border border-amber-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                                  value={cart[item.id]?.price || ''}
                                  onChange={e => setPrice(item.id, e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            {/* Cart & History - Right/Bottom */}
            <div className="lg:col-span-4 space-y-6">
              {/* Submission Card */}
              <div className="card-premium">
                <h3 className="font-black text-[var(--cafe-brown)] uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
                  <ShoppingCart size={14} className="text-[var(--cafe-gold)]" /> Cart Summary
                </h3>
                
                {Object.keys(cart).length === 0 ? (
                  <div className="text-center py-8 grayscale opacity-30">
                    <Receipt size={32} className="mx-auto mb-2 text-[var(--cafe-brown)]" />
                    <p className="text-xs font-bold uppercase tracking-widest">Cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4 mb-8">
                    {Object.entries(cart).map(([id, data]) => {
                      const item = menuItems.find(m => m.id === id)
                      return item ? (
                        <div key={id} className="flex flex-col bg-gray-50 p-3 rounded-xl border border-gray-100 gap-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-bold text-gray-900 leading-none">{item.name}</p>
                              <p className="text-[10px] font-black text-gray-400 uppercase mt-1">Qty: {data.qty}</p>
                            </div>
                            <p className="font-black text-[var(--cafe-brown)]">৳{(data.qty * data.price).toLocaleString()}</p>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Override ৳</span>
                            <input 
                              type="number"
                              className="w-20 text-right font-bold text-[var(--cafe-brown)] bg-transparent border-b border-gray-200 focus:outline-none focus:border-[var(--cafe-gold)] text-xs"
                              value={data.price}
                              onChange={e => setPrice(id, e.target.value)}
                            />
                          </div>
                        </div>
                      ) : null
                    })}
                    
                    <div className="bg-emerald-50 p-4 rounded-xl flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-emerald-800 tracking-wider">Total Revenue</span>
                      <span className="text-2xl font-black text-emerald-600">৳{cartTotal.toLocaleString()}</span>
                    </div>

                    {/* Stock Deduction Preview */}
                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                      <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest mb-3 flex items-center gap-1">
                        <Package size={12} /> Stock to be deducted
                      </p>
                      <div className="space-y-2">
                        {preview.map(p => (
                          <div key={p.name} className="flex justify-between text-xs font-bold">
                            <span className="text-amber-800 opacity-70">{p.name}</span>
                            <span className="text-amber-900">-{p.qty} {p.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={submitSales}
                  disabled={saving || Object.keys(cart).length === 0}
                  className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all disabled:opacity-40"
                >
                  {saving ? 'Processing...' : 'Submit Sales & Update Stock'}
                </button>
              </div>

              {/* Day's Log */}
              <div className="card no-scrollbar h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-6 shrink-0">
                   <h3 className="font-black text-[var(--cafe-brown)] uppercase text-xs tracking-widest flex items-center gap-2">
                    <TrendingUp size={14} className="text-[var(--cafe-gold)]" /> Today's Log
                  </h3>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-600 leading-none">৳{totalRevenue.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase mt-1 tracking-tighter">{totalQty} items today</p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-100 border-t-amber-900"></div></div>
                ) : sales.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-4 grayscale opacity-40">
                    <Receipt size={48} className="mb-4 text-[var(--cafe-brown)]" />
                    <p className="text-sm font-bold text-[var(--cafe-brown)]">No sales recorded yet.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3">
                    {sales.map(s => (
                      <div key={s.id} className="p-4 bg-[var(--cafe-cream)] rounded-2xl border border-[var(--cafe-cream-dark)] group transition-all hover:border-[var(--cafe-gold-light)]">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-[var(--cafe-brown)] leading-tight">{s.menu_items?.name}</p>
                            <span className="text-[9px] uppercase font-black text-amber-600 tracking-tighter bg-amber-50 px-1.5 py-0.5 rounded">{s.menu_items?.category}</span>
                          </div>
                          <button onClick={() => confirmDeleteSale(s)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex justify-between items-end mt-4">
                          <p className="text-xs font-black text-gray-400">{s.quantity}x served</p>
                          <p className="font-black text-emerald-600">৳{s.total_revenue?.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-6 pt-6 border-t border-gray-100 shrink-0 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                    <CheckCircle2 size={10} /> Real-time sync enabled
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        {...modalConfig}
      />
    </div>
  )
}
