'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import Modal from '../../../components/Modal'
import { useToast } from '../../../components/Toast'
import { PracticeBanner, PRACTICE_PAGES } from '../PracticeShared'
import { Plus, Edit3, Package, Download, Upload } from 'lucide-react'

const EMPTY_FORM = { name: '', barcode: '', base_unit: 'g', pack_size: '', par_level: '', active: true }

export default function PracticeItemsPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [seedModal, setSeedModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || (role !== 'admin' && role !== 'sub_admin' && role !== 'staff' && role !== 'manager')) {
      router.replace('/'); return
    }
    fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)
    const res = await fetch('/api/practice/items')
    const json = await res.json()
    if (json.error) addToast(json.error, 'error')
    setItems(json.items || [])
    setLoading(false)
  }

  function startEdit(item) {
    setEditId(item.id)
    setForm({ name: item.name, barcode: item.barcode, base_unit: item.base_unit, pack_size: item.pack_size, par_level: item.par_level, active: item.active })
    setShowForm(true)
  }

  function startNew() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  async function saveItem() {
    if (!form.name || !form.base_unit) { addToast('Name and base unit are required', 'error'); return }
    setSubmitting(true)

    const payload = {
      name: form.name,
      barcode: form.barcode || undefined,
      base_unit: form.base_unit,
      pack_size: parseInt(form.pack_size) || 1,
      par_level: parseInt(form.par_level) || 0,
      active: form.active,
    }

    const res = await fetch('/api/practice/items', {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
    })
    const json = await res.json()
    setSubmitting(false)
    if (json.error) { addToast(json.error, 'error'); return }
    addToast(editId ? 'Item updated!' : 'Item created!', 'success')
    setShowForm(false)
    setEditId(null)
    fetchItems()
  }

  async function seedItems() {
    setSeedModal(false)
    const res = await fetch('/api/practice/items/seed', { method: 'POST' })
    const json = await res.json()
    if (json.error) { addToast(json.error, 'error'); return }
    addToast(`Seeded ${json.seeded} sample items!`, 'success')
    fetchItems()
  }

  function downloadCSV() {
    const header = 'name,barcode,base_unit,pack_size,par_level'
    const rows = items.map(i => `"${i.name}","${i.barcode}","${i.base_unit}",${i.pack_size},${i.par_level}`)
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'practice_items.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function importCSV(e) {
    const file = e.target.files[0]
    if (!file) return
    setCsvImporting(true)
    const text = await file.text()
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const nameIdx = headers.indexOf('name')
    const barcodeIdx = headers.indexOf('barcode')
    const unitIdx = headers.indexOf('base_unit')
    const packIdx = headers.indexOf('pack_size')
    const parIdx = headers.indexOf('par_level')

    let success = 0, fail = 0
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const payload = {
        name: cells[nameIdx],
        barcode: cells[barcodeIdx] || undefined,
        base_unit: cells[unitIdx] || 'g',
        pack_size: parseInt(cells[packIdx]) || 1,
        par_level: parseInt(cells[parIdx]) || 0,
      }
      if (!payload.name) { fail++; continue }
      const res = await fetch('/api/practice/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      json.error ? fail++ : success++
    }
    setCsvImporting(false)
    addToast(`Imported ${success} items, ${fail} failed.`, success > 0 ? 'success' : 'error')
    fetchItems()
    e.target.value = ''
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
              background: p.href === '/practice-bazar/items' ? 'var(--primary)' : 'var(--bg-surface)',
              color: p.href === '/practice-bazar/items' ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${p.href === '/practice-bazar/items' ? 'var(--primary)' : 'var(--border-medium)'}`,
              textDecoration: 'none',
            }}>
              {p.label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Manage Practice Items</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Add, edit, and deactivate items used in practice bazar trips.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={() => setSeedModal(true)} style={{ padding: '9px 14px', fontSize: '13px' }}>
              🌱 Seed Sample Items
            </button>
            <label style={{ cursor: 'pointer' }}>
              <span className="btn-secondary" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 14px', fontSize: '13px',
                background: 'var(--bg-surface)', border: '1.5px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)', fontWeight: 600, color: 'var(--text-secondary)',
              }}>
                <Upload size={13} /> Import CSV
              </span>
              <input type="file" accept=".csv" onChange={importCSV} style={{ display: 'none' }} disabled={csvImporting} />
            </label>
            <button className="btn-secondary" onClick={downloadCSV} style={{ padding: '9px 14px', fontSize: '13px' }}>
              <Download size={13} /> Export CSV
            </button>
            <button className="btn-primary" onClick={startNew} style={{ padding: '9px 14px', fontSize: '13px' }}>
              <Plus size={15} /> Add Item
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: '20px', borderLeft: '4px solid var(--primary)' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px' }}>
              {editId ? 'Edit Item' : 'New Practice Item'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label className="label">Name *</label>
                <input className="input" placeholder="e.g. Coffee Beans" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Barcode (auto-generated if blank)</label>
                <input className="input" placeholder="Leave blank for auto" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
              </div>
              <div>
                <label className="label">Base Unit *</label>
                <select className="input" value={form.base_unit} onChange={e => setForm({ ...form, base_unit: e.target.value })}>
                  <option value="g">g (grams)</option>
                  <option value="ml">ml (millilitres)</option>
                  <option value="pcs">pcs (pieces)</option>
                </select>
              </div>
              <div>
                <label className="label">Default Pack Size</label>
                <input type="number" className="input" placeholder="e.g. 1000" value={form.pack_size} onChange={e => setForm({ ...form, pack_size: e.target.value })} min={1} />
              </div>
              <div>
                <label className="label">Par Level (min stock)</label>
                <input type="number" className="input" placeholder="e.g. 2000" value={form.par_level} onChange={e => setForm({ ...form, par_level: e.target.value })} min={0} />
              </div>
              {editId && (
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.active ? 'active' : 'inactive'} onChange={e => setForm({ ...form, active: e.target.value === 'active' })}>
                    <option value="active">Active</option>
                    <option value="inactive">Deactivated</option>
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-primary" onClick={saveItem} disabled={submitting} style={{ padding: '10px 20px' }}>
                {submitting ? 'Saving…' : editId ? 'Save Changes' : 'Create Item'}
              </button>
              <button className="btn-secondary" onClick={() => { setShowForm(false); setEditId(null) }} style={{ padding: '10px 20px' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Items table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}><div className="loader" /></div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Barcode</th>
                  <th>Unit</th>
                  <th>Pack Size</th>
                  <th>Par Level</th>
                  <th>Status</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ opacity: item.active ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{item.barcode}</td>
                    <td style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>{item.base_unit}</td>
                    <td>{item.pack_size}</td>
                    <td>{item.par_level}</td>
                    <td>
                      <span className={`badge ${item.active ? 'badge-green' : 'badge-gray'}`}>
                        {item.active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => startEdit(item)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                <Package size={36} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} strokeWidth={1.5} />
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No items yet. Click "Seed Sample Items" or add one manually.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <Modal
        isOpen={seedModal}
        onClose={() => setSeedModal(false)}
        onConfirm={seedItems}
        title="Seed Sample Items"
        message="This will insert 10 sample practice items (Coffee Beans, Milk, Sugar, Onion, Tomato, Chicken, Flour, Cooking Oil, Eggs, Cheese). Already-existing items are skipped. Continue?"
        confirmLabel="Yes, Seed Items"
        type="warning"
      />
    </div>
  )
}
