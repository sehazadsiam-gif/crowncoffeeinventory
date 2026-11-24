'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import Modal from '../../../components/Modal'
import { useToast } from '../../../components/Toast'
import { PracticeBanner, fmtQty, PRACTICE_PAGES } from '../PracticeShared'
import { RefreshCcw, Package, MinusCircle, AlertTriangle, TrendingDown } from 'lucide-react'

export default function PracticeInventoryPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [useModal, setUseModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [useQty, setUseQty] = useState('')
  const [useReason, setUseReason] = useState('')
  const [resetModal, setResetModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const username = typeof window !== 'undefined'
    ? (localStorage.getItem('cc_username') || 'staff')
    : 'staff'

  // Public practice mode: no login required
  useEffect(() => {
    fetchStock()
  }, [])

  async function fetchStock() {
    setLoading(true)
    const res = await fetch('/api/practice/stock')
    const json = await res.json()
    if (json.error) addToast(json.error, 'error')
    setStock((json.stock || []).filter(i => i.active))
    setLoading(false)
  }

  function getStatus(item) {
    if (item.current_stock <= 0) return { label: 'Out of Stock', badge: 'badge-red', border: 'var(--danger)', bg: 'var(--danger-bg)' }
    if (item.current_stock < item.par_level) return { label: 'Low Stock', badge: 'badge-amber', border: 'var(--warning)', bg: 'var(--warning-bg)' }
    return { label: 'In Stock', badge: 'badge-green', border: 'var(--success)', bg: 'transparent' }
  }

  function openUseModal(item) {
    setSelectedItem(item)
    setUseQty('')
    setUseReason('Simulated usage')
    setUseModal(true)
  }

  async function submitUse() {
    if (!useQty || parseInt(useQty) <= 0) { addToast('Enter a valid quantity', 'error'); return }
    setSubmitting(true)
    const res = await fetch('/api/practice/stock/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: selectedItem.id,
        quantity: parseInt(useQty),
        reason: useReason || 'Simulated usage',
        created_by: username,
      }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (json.error) { addToast(json.error, 'error'); return }
    addToast(`Used ${useQty} ${selectedItem.base_unit} of ${selectedItem.name}`, 'success')
    setUseModal(false)
    fetchStock()
  }

  async function resetAll() {
    setResetModal(false)
    const res = await fetch('/api/practice/stock/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'RESET' }),
    })
    const json = await res.json()
    if (json.error) { addToast(json.error, 'error'); return }
    addToast('All practice data cleared!', 'success')
    fetchStock()
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <PracticeBanner />

      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '24px 24px 80px' }}>
        {/* Sub-nav */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {PRACTICE_PAGES.map(p => (
            <Link key={p.href} href={p.href} style={{
              padding: '7px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
              background: p.href === '/practice-bazar/inventory' ? 'var(--primary)' : 'var(--bg-surface)',
              color: p.href === '/practice-bazar/inventory' ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${p.href === '/practice-bazar/inventory' ? 'var(--primary)' : 'var(--border-medium)'}`,
              textDecoration: 'none',
            }}>
              {p.label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Practice Inventory</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Stock is calculated from all practice movements. Never an editable number.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={fetchStock} style={{ padding: '9px 14px', fontSize: '13px' }}>
              <RefreshCcw size={14} /> Refresh
            </button>
            <button className="btn-danger" onClick={() => setResetModal(true)} style={{ padding: '9px 14px', fontSize: '13px' }}>
              🗑️ Reset All Practice Data
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px' }}><div className="loader" /></div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Base Unit</th>
                  <th>Current Stock</th>
                  <th>Par Level</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stock.map(item => {
                  const status = getStatus(item)
                  return (
                    <tr key={item.id} style={{ background: status.bg, borderLeft: `4px solid ${status.border}` }}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Package size={15} style={{ color: 'var(--text-muted)' }} />
                          {item.name}
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                        {item.base_unit}
                      </td>
                      <td>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: item.current_stock <= 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                          {fmtQty(item.current_stock, item.base_unit)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        {fmtQty(item.par_level, item.base_unit)}
                      </td>
                      <td>
                        <span className={`badge ${status.badge}`}>{status.label}</span>
                        {item.current_stock <= 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                            <AlertTriangle size={10} /> Needs restocking
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-secondary"
                          onClick={() => openUseModal(item)}
                          style={{ padding: '7px 14px', fontSize: '12px' }}
                        >
                          <TrendingDown size={13} /> Use Stock
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {stock.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                <Package size={36} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} strokeWidth={1.5} />
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No practice items yet. Add items or run a bazar trip first.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Use stock modal */}
      <Modal
        isOpen={useModal}
        onClose={() => setUseModal(false)}
        onConfirm={submitUse}
        title={`Use Stock: ${selectedItem?.name}`}
        confirmLabel={submitting ? 'Saving…' : 'Record Usage'}
        type="warning"
      >
        {selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: '8px', fontSize: '13px' }}>
              <strong>Current stock:</strong> {fmtQty(selectedItem.current_stock, selectedItem.base_unit)}
              <br />
              <strong>Base unit:</strong> {selectedItem.base_unit}
            </div>
            <div>
              <label className="label">Quantity to use ({selectedItem.base_unit})</label>
              <input
                type="number"
                className="input"
                placeholder={`Enter amount in ${selectedItem.base_unit}`}
                value={useQty}
                onChange={e => setUseQty(e.target.value)}
                autoFocus
                min={1}
              />
            </div>
            <div>
              <label className="label">Reason (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Simulated sale, Daily prep…"
                value={useReason}
                onChange={e => setUseReason(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Reset modal */}
      <Modal
        isOpen={resetModal}
        onClose={() => setResetModal(false)}
        onConfirm={resetAll}
        title="Reset All Practice Data"
        message="This will delete ALL practice trips, lines, and stock movements. Practice items are kept. This cannot be undone. Continue?"
        confirmLabel="Yes, Reset Everything"
        type="danger"
      />
    </div>
  )
}
