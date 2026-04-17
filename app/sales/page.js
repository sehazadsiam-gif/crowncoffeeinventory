'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import Link from 'next/link'
import dynamic from 'next/dynamic'
const DocumentScanner = dynamic(() => import('../../components/DocumentScanner'), { ssr: false })
import {
  ShoppingCart, CheckCircle2, Trash2, Info,
  Plus, Minus, Receipt, ArrowRight, Package,
  TrendingUp, Layers, X
} from 'lucide-react'

export default function SalesPage() {
  const { addToast } = useToast()
  const [menuItems, setMenuItems] = useState([])
  const [sales, setSales] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [cart, setCart] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState([])
  const [unrecognized, setUnrecognized] = useState([])
  const menuGridRef = useRef(null)

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
        newCart[match.id] = { qty: existing.qty + (item.quantity || 0), price: item.price || existing.price }
      } else {
        unknown.push(item.name)
      }
    })
    setCart(newCart)
    setUnrecognized(unknown)
    if (menuGridRef.current) menuGridRef.current.scrollIntoView({ behavior: 'smooth' })
    addToast(unknown.length > 0 ? `Scan processed with ${unknown.length} unrecognized items.` : 'Scan successful! All items matched.', unknown.length > 0 ? 'warning' : 'success')
  }

  async function fetchMenu() {
    const { data } = await supabase.from('menu_items').select('*, recipes(quantity, unit, ingredients(name, unit))').eq('is_active', true).order('category')
    setMenuItems(data || [])
  }

  async function fetchSales() {
    setLoading(true)
    const { data } = await supabase.from('sales').select('*, menu_items(name, selling_price, category)').eq('date', selectedDate).order('created_at')
    setSales(data || [])
    setLoading(false)
  }

  function setQty(id, qty) {
    const n = parseInt(qty) || 0
    if (n <= 0) { const c = { ...cart }; delete c[id]; setCart(c) }
    else {
      const item = menuItems.find(m => m.id === id)
      setCart({ ...cart, [id]: { qty: n, price: cart[id]?.price || item?.selling_price || 0 } })
    }
  }

  function setPrice(id, price) {
    const p = parseFloat(price) || 0
    if (cart[id]) setCart({ ...cart, [id]: { ...cart[id], price: p } })
  }

  function computePreview() {
    const deductions = {}
    const convert = (qty, from, to) => {
      if (!from || !to || from === to) return qty
      if (from === 'gm' && to === 'kg') return qty / 1000
      if (from === 'kg' && to === 'gm') return qty * 1000
      if (from === 'ml' && to === 'ltr') return qty / 1000
      if (from === 'ltr' && to === 'ml') return qty * 1000
      return qty
    }
    for (const [menuItemId, data] of Object.entries(cart)) {
      const { qty } = data
      const item = menuItems.find(m => m.id === menuItemId)
      if (!item) continue
      for (const r of item.recipes || []) {
        const key = r.ingredients.name
        const stockUnit = r.ingredients.unit
        const recipeUnit = r.unit || stockUnit
        const convertedUsage = convert(r.quantity * qty, recipeUnit, stockUnit)
        deductions[key] = (deductions[key] || 0) + convertedUsage
        deductions[`${key}__unit`] = stockUnit
      }
    }
    const result = Object.entries(deductions)
      .filter(([k]) => !k.endsWith('__unit'))
      .map(([name, qty]) => ({ name, qty: qty >= 1 ? qty.toFixed(2) : qty.toFixed(3), unit: deductions[`${name}__unit`] }))
    setPreview(result)
  }

  async function submitSales() {
    const entries = Object.entries(cart).filter(([, data]) => data.qty > 0)
    if (entries.length === 0) return addToast('Please add items to your cart', 'error')
    setSaving(true)
    const inserts = entries.map(([menu_item_id, data]) => ({
      date: selectedDate, menu_item_id, quantity: data.qty, total_revenue: data.qty * data.price
    }))
    const { error } = await supabase.from('sales').insert(inserts)
    if (error) { addToast(error.message || 'Something went wrong', 'error'); setSaving(false); return }
    setCart({})
    await fetchSales()
    setSaving(false)
    addToast('Sales recorded. Stock has been deducted based on recipes.', 'success')
  }

  function confirmDeleteSale(sale) {
    setModalConfig({
      title: 'Delete Sale Record',
      message: `Remove the sale of ${sale.quantity}x ${sale.menu_items?.name}?`,
      onConfirm: () => deleteSale(sale.id),
      confirmLabel: 'Delete Record',
    })
    setModalOpen(true)
  }

  async function deleteSale(id) {
    const { error } = await supabase.from('sales').delete().eq('id', id)
    if (error) { addToast(error.message || 'Something went wrong', 'error'); return }
    addToast('Sale record removed', 'success')
    fetchSales()
  }

  const totalRevenue = sales.reduce((s, e) => s + (e.total_revenue || 0), 0)
  const totalQty = sales.reduce((s, e) => s + (e.quantity || 0), 0)
  const cartTotal = Object.entries(cart).reduce((s, [id, data]) => s + (data.qty * data.price), 0)
  const grouped = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      <header style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-light)', padding: '32px 0 24px' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 400, color: 'var(--text-primary)' }}>Record Sales</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '6px' }}>
            Daily sales entry and stock deduction
          </p>
          <div style={{ marginTop: '12px', width: '40px', height: '1px', background: 'var(--accent-gold)' }} />
        </div>
      </header>

      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>
        <div className="instruction-box animate-in">
          Enter how many of each item you sold today. Stock will be automatically deducted based on the recipes defined for each menu item.
        </div>

        {menuItems.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Layers size={40} style={{ margin: '0 auto 16px', color: 'var(--text-muted)', opacity: 0.4 }} strokeWidth={1} />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>No menu items found.</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Add items in the Menu page before recording sales.</p>
            <Link href="/menu" className="btn-primary" style={{ display: 'inline-flex' }}>Go to Menu Page</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '24px', alignItems: 'start' }} className="sales-grid">

            {/* Menu Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <DocumentScanner onScanComplete={handleScan} scanType="sales" menuItems={menuItems.map(m => m.name)} />

              {unrecognized.length > 0 && (
                <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(166,60,60,0.2)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info size={14} /> These items were not recognized:
                    </p>
                    <button onClick={() => setUnrecognized([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                      <X size={14} />
                    </button>
                  </div>
                  <ul style={{ paddingLeft: '20px' }}>
                    {unrecognized.map((name, i) => (
                      <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--danger)', marginBottom: '4px' }}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="divider-label">Or select manually below</div>

              {/* Date + Running Total */}
              <div ref={menuGridRef} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <label className="label">Sales Date</label>
                  <input type="date" className="input" style={{ width: 'auto', fontWeight: 500, color: 'var(--accent-brown)' }} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Current Total</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--accent-brown)' }}>৳{cartTotal.toLocaleString()}</p>
                </div>
              </div>

              {/* Menu Grid by Category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {Object.entries(grouped).map(([category, items]) => (
                  <section key={category}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{category}</p>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                      {items.map(item => {
                        const qty = cart[item.id]?.qty || 0
                        const isInCart = qty > 0
                        return (
                          <div key={item.id} style={{
                            background: 'var(--bg-surface)',
                            border: `1px solid ${isInCart ? 'var(--accent-gold)' : 'var(--border-light)'}`,
                            borderRadius: '10px',
                            padding: '14px 16px',
                            boxShadow: isInCart ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                            transition: 'all 0.2s ease',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                              <div>
                                <p style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{item.name}</p>
                                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>৳{item.selling_price}</p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '4px' }}>
                                <button onClick={() => setQty(item.id, qty - 1)} style={{
                                  width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.15s ease',
                                }}><Minus size={14} /></button>
                                <input
                                  type="number"
                                  style={{ width: '36px', textAlign: 'center', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', color: 'var(--accent-brown)', background: 'transparent', border: 'none', outline: 'none' }}
                                  value={qty || ''}
                                  onChange={e => setQty(item.id, e.target.value)}
                                  placeholder="0"
                                />
                                <button onClick={() => setQty(item.id, qty + 1)} style={{
                                  width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.15s ease',
                                }}><Plus size={14} /></button>
                              </div>
                            </div>

                            {isInCart && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Selling ৳</span>
                                <input
                                  type="number"
                                  style={{ width: '80px', textAlign: 'right', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', color: 'var(--success)', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '4px 8px', outline: 'none' }}
                                  value={cart[item.id]?.price || ''}
                                  onChange={e => setPrice(item.id, e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            {/* Order Summary + Log */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '80px' }}>

              {/* Cart Summary */}
              <div className="card" style={{ borderLeft: '3px solid var(--accent-gold)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
                  Order Summary
                </h3>

                {Object.keys(cart).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', opacity: 0.5 }}>
                    <Receipt size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} strokeWidth={1} />
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>Cart is empty</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    {Object.entries(cart).map(([id, data]) => {
                      const item = menuItems.find(m => m.id === id)
                      return item ? (
                        <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</p>
                              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Qty: {data.qty}</p>
                            </div>
                            <p style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: 'var(--accent-brown)' }}>৳{(data.qty * data.price).toLocaleString()}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Override ৳</span>
                            <input
                              type="number"
                              style={{ width: '70px', textAlign: 'right', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-brown)', background: 'transparent', borderBottom: '1px solid var(--border-medium)', border: 'none', borderBottom: '1px solid var(--border-medium)', outline: 'none', paddingBottom: '2px' }}
                              value={data.price}
                              onChange={e => setPrice(id, e.target.value)}
                            />
                          </div>
                        </div>
                      ) : null
                    })}

                    <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(58,125,92,0.15)', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--success)' }}>Total Revenue</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--success)' }}>৳{cartTotal.toLocaleString()}</span>
                    </div>

                    {preview.length > 0 && (
                      <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(176,120,48,0.15)', borderRadius: '8px', padding: '12px 14px' }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--warning)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Package size={12} /> Stock to be deducted
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {preview.map(p => (
                            <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)' }}>{p.name}</span>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--warning)' }}>-{p.qty} {p.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={submitSales}
                  disabled={saving || Object.keys(cart).length === 0}
                  className="btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '12px' }}
                >
                  {saving ? 'Processing...' : 'Submit Sales & Update Stock'}
                </button>
              </div>

              {/* Day's Log */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', maxHeight: '400px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Today's Log</h3>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: 'var(--success)' }}>৳{totalRevenue.toLocaleString()}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{totalQty} items sold</p>
                  </div>
                </div>

                {loading ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loader" /></div>
                ) : sales.length === 0 ? (
                  <div style={{ flex: 1, textAlign: 'center', padding: '24px', opacity: 0.5 }}>
                    <Receipt size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} strokeWidth={1} />
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)' }}>No sales recorded yet.</p>
                  </div>
                ) : (
                  <div style={{ flex: 1, overflowY: 'auto' }} className="no-scrollbar">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {sales.map(s => (
                        <div key={s.id} style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-medium)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{s.menu_items?.name}</p>
                              <span className="badge badge-gold" style={{ marginTop: '4px', display: 'inline-block' }}>{s.menu_items?.category}</span>
                            </div>
                            <button onClick={() => confirmDeleteSale(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-medium)', padding: '2px' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-muted)' }}>{s.quantity}x served</p>
                            <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 600, color: 'var(--success)' }}>৳{s.total_revenue?.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} {...modalConfig} />

      <style>{`
        @media (max-width: 768px) {
          .sales-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
