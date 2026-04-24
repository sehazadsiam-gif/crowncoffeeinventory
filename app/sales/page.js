'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import ErrorBoundary from '../../components/ErrorBoundary'
import Link from 'next/link'
import {
  ShoppingCart, CheckCircle2, Trash2, Info,
  Plus, Minus, Receipt, ArrowRight, Package,
  TrendingUp, Layers, X, Calendar, Search, FileSpreadsheet, Upload, Download
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { convertUnit } from '../../lib/convert'

export default function SalesPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [menuItems, setMenuItems] = useState([])
  const [sales, setSales] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [cart, setCart] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setModalConfig] = useState({})
  const [importFile, setImportFile] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0])

  const menuGridRef = useRef(null)

    useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || role !== 'admin') {
      router.replace('/')
      return
    }
     fetchMenu() }, [])
  useEffect(() => { fetchSales() }, [selectedDate])
  useEffect(() => { computePreview() }, [cart])

  async function fetchMenu() {
    try {
      const { data, error } = await supabase.from('menu_items').select('*, recipes(quantity, unit, ingredients(name, unit))').eq('is_active', true).order('category')
      if (error) throw error
      setMenuItems(data || [])
    } catch (err) {
      console.error('fetchMenu error:', err)
      setMenuItems([])
    }
  }

  async function fetchSales() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('sales').select('*, menu_items(name, selling_price, category)').eq('date', selectedDate).order('created_at')
      if (error) throw error
      setSales(data || [])
    } catch (err) {
      console.error('fetchSales error:', err)
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  function setQty(id, qty) {
    if (!id) return
    const n = parseInt(qty) || 0
    setCart(prev => {
      const updated = { ...prev }
      if (n <= 0) {
        delete updated[id]
      } else {
        const item = (menuItems || []).find(m => m?.id === id)
        updated[id] = { qty: n, price: updated[id]?.price || item?.selling_price || 0 }
      }
      return updated
    })
  }

  function setPrice(id, price) {
    if (!id) return
    const p = parseFloat(price) || 0
    if (cart[id]) setCart({ ...cart, [id]: { ...cart[id], price: p } })
  }

  function computePreview() {
    try {
      if (!menuItems || !cart) return
      const deductions = {}
      for (const [menuItemId, data] of Object.entries(cart || {})) {
        if (!menuItemId || !data) continue
        const { qty } = data
        const item = (menuItems || []).find(m => m?.id === menuItemId)
        if (!item) continue
        for (const r of (item.recipes || [])) {
          if (!r?.ingredients?.name) continue
          const key = r.ingredients.name
          const stockUnit = r.ingredients.unit
          const recipeUnit = r.unit || stockUnit
          const convertedUsage = convertUnit((r.quantity || 0) * qty, recipeUnit, stockUnit)
          deductions[key] = (deductions[key] || 0) + convertedUsage
          deductions[`${key}__unit`] = stockUnit
        }
      }
      const result = Object.entries(deductions)
        .filter(([k]) => !k.endsWith('__unit'))
        .map(([name, qty]) => ({ name, qty: qty >= 1 ? qty.toFixed(2) : qty.toFixed(3), unit: deductions[`${name}__unit`] || '' }))
      setPreview(result)
    } catch (err) {
      console.error('computePreview error:', err)
      setPreview([])
    }
  }

  async function submitSales() {
    try {
      const entries = Object.entries(cart || {}).filter(([id, data]) => id && data && data.qty > 0)
      if (entries.length === 0) return addToast('Please add items to your cart', 'error')
      setSaving(true)
      const inserts = entries.map(([menu_item_id, data]) => ({
        date: selectedDate,
        menu_item_id,
        quantity: data.qty,
        total_revenue: data.qty * (data.price || 0)
      }))
      const { error } = await supabase.from('sales').insert(inserts)
      if (error) throw error
      setCart({})
      await fetchSales()
      addToast('Sales recorded. Stock has been deducted based on recipes.', 'success')
    } catch (err) {
      console.error('submitSales error:', err)
      addToast(err.message || 'Unexpected error. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function confirmDeleteSale(sale) {
    if (!sale) return
    setModalConfig({
      title: 'Delete Sale Record',
      message: `Remove the sale of ${sale.quantity}x ${sale.menu_items?.name || 'this item'}?`,
      onConfirm: () => deleteSale(sale.id),
      confirmLabel: 'Delete Record',
    })
    setModalOpen(true)
  }

  async function deleteSale(id) {
    if (!id) return
    try {
      const { error } = await supabase.from('sales').delete().eq('id', id)
      if (error) throw error
      addToast('Sale record removed', 'success')
      fetchSales()
    } catch (err) {
      console.error('deleteSale error:', err)
      addToast(err.message || 'Something went wrong', 'error')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) processSalesFile(file)
  }

  async function processSalesFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      return addToast('File too large (max 5MB)', 'error')
    }
    setImportFile(file)
    try {
      const bytes = await file.arrayBuffer()
      const workbook = XLSX.read(bytes, { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)

      const preview = rows.map(row => {
        const itemName = row['Item Name'] || row['item_name'] || row['Item']
        const qty = parseInt(row['Quantity'] || row['quantity'] || 0)
        
        // Find best match
        const match = menuItems.find(m => 
          m.name.toLowerCase() === itemName?.toString().toLowerCase() ||
          m.name.toLowerCase().includes(itemName?.toString().toLowerCase())
        )

        return {
          originalName: itemName,
          matchedId: match?.id || '',
          qty,
          price: match?.selling_price || 0,
          status: match ? 'matched' : 'unmatched'
        }
      }).filter(r => r.originalName && r.qty > 0)

      setImportPreview(preview)
    } catch (err) {
      addToast('Error reading file', 'error')
    }
  }

  async function confirmImport() {
    if (!importPreview || importPreview.length === 0) return
    setSaving(true)
    try {
      const toInsert = importPreview.map(row => ({
        date: importDate,
        menu_item_id: row.matchedId,
        quantity: row.qty,
        total_revenue: row.qty * row.price
      })).filter(r => r.menu_item_id)

      if (toInsert.length === 0) throw new Error('No matched items to import')

      const { error } = await supabase.from('sales').insert(toInsert)
      if (error) throw error

      addToast(`Imported ${toInsert.length} records successfully`, 'success')
      setImportFile(null)
      setImportPreview(null)
      fetchSales()
    } catch (err) {
      addToast(err.message || 'Import failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const totalRevenue = (sales || []).reduce((s, e) => s + (e?.total_revenue || 0), 0)
  const totalQty = (sales || []).reduce((s, e) => s + (e?.quantity || 0), 0)
  const cartTotal = Object.entries(cart || {}).reduce((s, [id, data]) => s + ((data?.qty || 0) * (data?.price || 0)), 0)
  
  const grouped = (menuItems || [])
    .filter(item => !searchQuery || item?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .reduce((acc, item) => {
      if (!item) return acc
      const cat = item.category || 'Other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {})

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <ErrorBoundary>
        <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 600 }}>Daily Sales</h1>
              <p style={{ color: 'var(--text-muted)' }}>
                Record items sold to update inventory and revenue
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-medium)' }}>
              <Calendar size={18} style={{ color: 'var(--primary)' }} />
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="instruction-box">
            Select items from the menu, click to increase quantity. The right panel shows your current order 
            and the projected stock impact based on the recipe.
          </div>

          {(menuItems || []).length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <Layers size={40} style={{ margin: '0 auto 16px', color: 'var(--text-muted)', opacity: 0.4 }} strokeWidth={1} />
              <p style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>No menu items found.</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Add items in the Menu page before recording sales.</p>
              <Link href="/menu" className="btn-primary" style={{ display: 'inline-flex' }}>Go to Menu Page</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '24px', alignItems: 'start' }} className="sales-grid">

              {/* Menu Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="divider-label">Select items manually below</div>

                {/* Date + Running Total */}
                <div ref={menuGridRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  
                  <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Search menu items..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px 10px 36px', fontSize: '14px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a href="/api/sales/template" className="btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', textDecoration: 'none' }}>
                      <Download size={14} /> Template
                    </a>
                    <button 
                      onClick={() => document.getElementById('salesFile').click()}
                      className="btn-primary" 
                      style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    >
                      <Upload size={14} /> Import File
                    </button>
                    <input id="salesFile" type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Current Total</p>
                    <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--primary)' }}>৳{cartTotal.toLocaleString()}</p>
                  </div>
                </div>

                {importPreview && (
                  <div className="card" style={{ border: '2px solid var(--primary)', background: '#F0F9FF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Import Preview</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>Import for:</span>
                          <input type="date" value={importDate} onChange={e => setImportDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" onClick={() => setImportPreview(null)} style={{ padding: '6px 12px', fontSize: '13px' }}>Cancel</button>
                        <button className="btn-primary" onClick={confirmImport} style={{ padding: '6px 12px', fontSize: '13px' }}>Confirm Import</button>
                      </div>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', borderBottom: '1px solid #CBD5E1' }}>
                            <th style={{ padding: '8px' }}>File Item</th>
                            <th style={{ padding: '8px' }}>Matched To</th>
                            <th style={{ padding: '8px' }}>Qty</th>
                            <th style={{ padding: '8px' }}>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', background: row.status === 'unmatched' ? '#FEF2F2' : 'transparent' }}>
                              <td style={{ padding: '8px' }}>{row.originalName}</td>
                              <td style={{ padding: '8px' }}>
                                <select 
                                  value={row.matchedId} 
                                  onChange={(e) => {
                                    const newId = e.target.value
                                    const item = menuItems.find(m => m.id === newId)
                                    const next = [...importPreview]
                                    next[idx] = { ...next[idx], matchedId: newId, price: item?.selling_price || 0, status: newId ? 'matched' : 'unmatched' }
                                    setImportPreview(next)
                                  }}
                                  style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #CBD5E1' }}
                                >
                                  <option value="">Select menu item...</option>
                                  {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '8px' }}>{row.qty}</td>
                              <td style={{ padding: '8px' }}>৳{(row.qty * row.price).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Menu Grid by Category */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {Object.entries(grouped || {}).map(([category, items]) => (
                    <section key={category || 'uncategorized'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{category}</p>
                        <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                        {(items || []).map(item => {
                          if (!item) return null
                          const qty = cart[item.id]?.qty || 0
                          const isInCart = qty > 0
                          return (
                            <div key={item.id} style={{
                              background: 'var(--bg-surface)',
                              border: `1px solid ${isInCart ? 'var(--primary)' : 'var(--border-light)'}`,
                              borderRadius: '10px',
                              padding: '16px',
                              boxShadow: isInCart ? 'var(--shadow-sm)' : 'none',
                              transition: 'all 0.15s ease',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '16px' }}>
                                <div>
                                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{item.name}</p>
                                  <p style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>৳{item.selling_price}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '4px' }}>
                                  <button onClick={() => setQty(item.id, qty - 1)} style={{
                                    width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)'
                                  }}><Minus size={14} /></button>
                                  <input
                                    type="number"
                                    style={{ width: '36px', textAlign: 'center', fontWeight: 700, fontSize: '14px', color: 'var(--primary)', background: 'transparent', border: 'none', outline: 'none' }}
                                    value={qty || ''}
                                    onChange={e => setQty(item.id, e.target.value)}
                                    placeholder="0"
                                  />
                                  <button onClick={() => setQty(item.id, qty + 1)} style={{
                                    width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border-medium)', background: 'var(--bg-surface)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)'
                                  }}><Plus size={14} /></button>
                                </div>
                              </div>

                              {isInCart && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Selling ৳</span>
                                  <input
                                    type="number"
                                    style={{ width: '80px', textAlign: 'right', fontWeight: 700, fontSize: '13px', color: 'var(--success)', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '6px 8px', outline: 'none' }}
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
                <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
                    Order Summary
                  </h3>

                  {Object.keys(cart || {}).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', opacity: 0.5 }}>
                      <Receipt size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} strokeWidth={1} />
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Cart is empty</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                      {Object.entries(cart || {}).map(([id, data]) => {
                        const item = (menuItems || []).find(m => m?.id === id)
                        return item && data ? (
                          <div key={id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</p>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Qty: {data.qty}</p>
                              </div>
                              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)' }}>৳{((data.qty || 0) * (data.price || 0)).toLocaleString()}</p>
                            </div>
                          </div>
                        ) : null
                      })}

                      <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--success)' }}>Total Revenue</span>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)' }}>৳{cartTotal.toLocaleString()}</span>
                      </div>

                      {(preview || []).length > 0 && (
                        <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: '8px', padding: '12px 14px' }}>
                          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--warning)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Package size={14} /> Stock to be deducted
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {preview.map(p => (
                              <div key={p?.name || Math.random()} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px', color: 'var(--warning)' }}>{p?.name}</span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--warning)' }}>-{p?.qty} {p?.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={submitSales}
                    disabled={saving || Object.keys(cart || {}).length === 0}
                    className="btn-primary"
                    style={{ width: '100%', padding: '14px', fontSize: '14px' }}
                  >
                    {saving ? 'Processing...' : 'Submit Sales & Update Stock'}
                  </button>
                </div>

                {/* Day's Log */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', maxHeight: '400px', padding: 0 }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-subtle)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Today's Log</h3>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--success)' }}>৳{totalRevenue.toLocaleString()}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{totalQty} items sold</p>
                    </div>
                  </div>

                  {loading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}><div className="loader" /></div>
                  ) : (sales || []).length === 0 ? (
                    <div style={{ flex: 1, textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                      <Receipt size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} strokeWidth={1} />
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No sales recorded yet.</p>
                    </div>
                  ) : (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }} className="no-scrollbar">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(sales || []).map(s => {
                          if (!s) return null
                          return (
                            <div key={s.id} style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{s.menu_items?.name || 'Unknown Item'}</p>
                                  <span className="badge badge-gray" style={{ marginTop: '4px' }}>{s.menu_items?.category || 'Uncategorized'}</span>
                                </div>
                                <button onClick={() => confirmDeleteSale(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.quantity}x served</p>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success)' }}>৳{s.total_revenue?.toLocaleString()}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </ErrorBoundary>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} {...modalConfig} />

      <style>{`
        @media (max-width: 768px) {
          .sales-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
