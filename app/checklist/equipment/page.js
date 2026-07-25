'use client'

import { useState, useEffect } from 'react'
import Navbar from '../../../components/Navbar'
import { useToast } from '../../../components/Toast'
import {
  Plus, Edit3, Trash2, Search, Calendar, Lock,
  FileSpreadsheet, Wrench, Package, DollarSign, X, Check
} from 'lucide-react'
import * as xlsx from 'xlsx'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const STATUS_CONFIG = {
  working:     { label: 'Working',     dot: '#22C55E', bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  maintenance: { label: 'Maintenance', dot: '#F59E0B', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  damaged:     { label: 'Damaged',     dot: '#EF4444', bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
  checked:     { label: 'Verified',    dot: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
}

const INPUT_STYLE = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #E2E8F0',
  borderRadius: '10px',
  fontSize: '14px',
  color: '#0F172A',
  outline: 'none',
  background: '#fff',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
}

const LABEL_STYLE = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: '#475569',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

// ──────────────────────────────────────────────
// LOCK SCREEN
// ──────────────────────────────────────────────
function LockScreen({ onUnlock }) {
  const { addToast } = useToast()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pin.trim()) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/checklist/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        sessionStorage.setItem('cc_mgr_checklist_authed', 'true')
        onUnlock()
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F1F5F9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: '20px',
        padding: '48px 44px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 8px 40px rgba(15,23,42,0.07)',
        textAlign: 'center',
      }}>
        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{
            width: '40px', height: '40px',
            background: 'linear-gradient(135deg, #7C3A1E, #D4933A)',
            borderRadius: '11px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock size={18} color="#fff" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.01em' }}>Crown Coffee</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Check-List Portal</div>
          </div>
        </div>

        <div style={{ width: '40px', height: '2px', background: '#E2E8F0', borderRadius: '2px', margin: '0 auto 28px' }} />

        <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
          Manager Authentication
        </h2>
        <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 28px', lineHeight: 1.6 }}>
          Enter your Manager password to access the Equipment Check-List.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px', textAlign: 'left' }}>
            <label style={{ ...LABEL_STYLE, marginBottom: '8px' }}>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={pin}
              onChange={e => { setPin(e.target.value); setError(false) }}
              autoFocus
              style={{
                ...INPUT_STYLE,
                padding: '12px 16px',
                fontSize: '16px',
                letterSpacing: '3px',
                border: error ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
                background: '#F8FAFC',
              }}
            />
            {error && (
              <p style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600, margin: '6px 0 0' }}>
                Incorrect password. Please try again.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !pin.trim()}
            style={{
              width: '100%',
              padding: '12px',
              background: loading || !pin.trim() ? '#E2E8F0' : '#0F172A',
              color: loading || !pin.trim() ? '#94A3B8' : '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 800,
              cursor: loading ? 'wait' : !pin.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Verifying…' : 'Unlock Check-List'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// KPI CARD
// ──────────────────────────────────────────────
function KpiCard({ icon, label, value, accent }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E2E8F0',
      borderRadius: '14px',
      padding: '20px 22px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ color: accent }}>{icon}</div>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  )
}

// ──────────────────────────────────────────────
// STATUS BADGE
// ──────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.working
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '4px 10px',
      borderRadius: '20px',
      border: `1px solid ${cfg.border}`,
      background: cfg.bg,
      color: cfg.text,
      fontSize: '11px',
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

// ──────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────
export default function EquipmentChecklistPage() {
  const { addToast } = useToast()

  const [isUnlocked, setIsUnlocked] = useState(false)
  const [month, setMonth]     = useState(new Date().getMonth() + 1)
  const [year, setYear]       = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [items, setItems]     = useState([])
  const [search, setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Inline form
  const [showForm, setShowForm]     = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ item_name: '', quantity: 1, price: '', status: 'working', notes: '' })
  const [saving, setSaving] = useState(false)

  // Action PIN Modal (1590) for Edit/Delete protection
  const [actionPinModalOpen, setActionPinModalOpen] = useState(false)
  const [pendingAction, setPendingAction]           = useState(null)
  const [actionPinInput, setActionPinInput]         = useState('')
  const [actionPinError, setActionPinError]         = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('cc_mgr_checklist_authed') === 'true') setIsUnlocked(true)
  }, [])

  useEffect(() => {
    if (isUnlocked) fetchItems()
  }, [isUnlocked, month, year])

  // Helper to enforce PIN 1590 before executing edit/delete actions
  function requireActionPin(onAuthorized) {
    const isAuthed = sessionStorage.getItem('cc_checklist_action_authed') === 'true'
    if (isAuthed) {
      onAuthorized('1590')
      return
    }
    setPendingAction(() => onAuthorized)
    setActionPinInput('')
    setActionPinError(false)
    setActionPinModalOpen(true)
  }

  function handleVerifyActionPin(e) {
    e.preventDefault()
    if (actionPinInput.trim() === '1590') {
      sessionStorage.setItem('cc_checklist_action_authed', 'true')
      setActionPinModalOpen(false)
      if (pendingAction) {
        pendingAction('1590')
        setPendingAction(null)
      }
    } else {
      setActionPinError(true)
      addToast('Invalid Edit/Delete Security PIN', 'error')
    }
  }

  async function fetchItems() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/checklist/equipment?month=${month}&year=${year}`)
      const json = await res.json()
      setItems(json.items || [])
    } catch {
      addToast('Failed to load checklist', 'error')
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditTarget(null)
    setForm({ item_name: '', quantity: 1, price: '', status: 'working', notes: '' })
    setShowForm(true)
  }

  function openEdit(item) {
    requireActionPin(() => {
      setEditTarget(item)
      setForm({
        item_name: item.item_name || '',
        quantity:  item.quantity  || 1,
        price:     item.price !== null && item.price !== undefined ? item.price : '',
        status:    item.status || 'working',
        notes:     item.notes  || '',
      })
      setShowForm(true)
    })
  }

  function closeForm() {
    setShowForm(false)
    setEditTarget(null)
    setForm({ item_name: '', quantity: 1, price: '', status: 'working', notes: '' })
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.item_name.trim()) { addToast('Item name is required', 'error'); return }

    const isEdit = !!editTarget

    const executeSave = async () => {
      setSaving(true)
      try {
        const res = await fetch('/api/checklist/equipment', {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, month, year, id: editTarget?.id, action_pin: isEdit ? '1590' : undefined })
        })
        const json = await res.json()
        if (res.ok && json.success) {
          addToast(isEdit ? 'Item updated' : 'Item added', 'success')
          closeForm()
          fetchItems()
        } else {
          addToast(json.error || 'Failed to save', 'error')
        }
      } catch {
        addToast('Network error', 'error')
      } finally {
        setSaving(false)
      }
    }

    if (isEdit) {
      requireActionPin(() => executeSave())
    } else {
      executeSave()
    }
  }

  async function handleStatusChange(item, newStatus) {
    requireActionPin(async () => {
      const prev = items
      setItems(items.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
      try {
        const res = await fetch('/api/checklist/equipment', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, status: newStatus, action_pin: '1590' })
        })
        if (!res.ok) { setItems(prev); addToast('Failed to update status', 'error') }
      } catch {
        setItems(prev)
        addToast('Network error', 'error')
      }
    })
  }

  async function handleDelete(id) {
    requireActionPin(async () => {
      if (!confirm('Remove this equipment item?')) return
      setItems(items.filter(i => i.id !== id))
      try {
        const res = await fetch(`/api/checklist/equipment?id=${id}&action_pin=1590`, { method: 'DELETE' })
        if (!res.ok) { fetchItems(); addToast('Failed to delete', 'error') }
        else addToast('Item removed', 'info')
      } catch {
        fetchItems()
        addToast('Network error', 'error')
      }
    })
  }

  function handleExcel() {
    if (!filtered.length) { addToast('No items to export', 'error'); return }
    const rows = filtered.map((item, i) => ({
      '#':             i + 1,
      'Item Name':     item.item_name,
      'Quantity':      item.quantity,
      'Unit Price':    item.price ?? 'N/A',
      'Total Value':   item.price != null ? item.price * item.quantity : 'N/A',
      'Status':        STATUS_CONFIG[item.status]?.label ?? item.status,
      'Notes':         item.notes || '',
    }))
    const ws = xlsx.utils.json_to_sheet(rows)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, 'Equipment')
    xlsx.writeFile(wb, `CrownCoffee_Equipment_${MONTHS[month - 1]}_${year}.xlsx`)
    addToast('Excel exported', 'success')
  }

  // Computed
  const filtered = items.filter(item => {
    const matchSearch = !search || item.item_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || item.status === statusFilter
    return matchSearch && matchStatus
  })
  const totalQty = items.reduce((s, i) => s + Number(i.quantity || 0), 0)
  const totalVal = items.reduce((s, i) => s + (i.price != null ? Number(i.price) * Number(i.quantity) : 0), 0)

  // ── Lock Screen ──
  if (!isUnlocked) return <LockScreen onUnlock={() => setIsUnlocked(true)} />

  // ── Main UI ──
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0F172A' }}>
      <Navbar />

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '36px 24px 80px' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#D4933A', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
              Check-List · Equipments
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Equipments Check-List
            </h1>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0' }}>
              Monthly equipment inventory, condition audit & valuation.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleExcel}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 16px',
                background: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                fontSize: '13px', fontWeight: 700, color: '#475569',
                cursor: 'pointer',
              }}
            >
              <FileSpreadsheet size={15} /> Export Excel
            </button>
            <button
              onClick={() => showForm && !editTarget ? closeForm() : openAdd()}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 18px',
                background: showForm && !editTarget ? '#F1F5F9' : '#0F172A',
                border: showForm && !editTarget ? '1px solid #E2E8F0' : 'none',
                borderRadius: '10px',
                fontSize: '13px', fontWeight: 800,
                color: showForm && !editTarget ? '#64748B' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {showForm && !editTarget ? <><X size={15} /> Cancel</> : <><Plus size={16} /> Add Item</>}
            </button>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <KpiCard icon={<Wrench size={18} />}    label="Equipment Types"   value={items.length}                                accent="#0F172A" />
          <KpiCard icon={<Package size={18} />}   label="Total Units"       value={totalQty}                                    accent="#3B82F6" />
          <KpiCard icon={<DollarSign size={18} />} label="Total Valuation"  value={`৳${totalVal.toLocaleString('en-IN')}`}      accent="#D97706" />
        </div>

        {/* ── INLINE ADD / EDIT FORM ── */}
        {showForm && (
          <div style={{
            background: '#fff',
            border: '1.5px solid #0F172A',
            borderRadius: '14px',
            padding: '24px 28px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                {editTarget ? 'Edit Equipment Item' : 'New Equipment Item'}
              </span>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              {/* Row 1: Name (wide) + Qty + Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={LABEL_STYLE}>Item Name <span style={{ color: '#EF4444' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Espresso Machine, Grinder, POS Terminal"
                    value={form.item_name}
                    onChange={e => setForm({ ...form, item_name: e.target.value })}
                    required
                    autoFocus
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Quantity <span style={{ color: '#EF4444' }}>*</span></label>
                  <input
                    type="number" min="1"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    required
                    style={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Price (BDT) <span style={{ color: '#CBD5E1', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>optional</span></label>
                  <input
                    type="number" min="0" placeholder="e.g. 150000"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    style={INPUT_STYLE}
                  />
                </div>
              </div>

              {/* Row 2: Condition + Notes + Save */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '14px', alignItems: 'flex-end' }}>
                <div>
                  <label style={LABEL_STYLE}>Condition</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={INPUT_STYLE}>
                    <option value="working">Working</option>
                    <option value="maintenance">Needs Maintenance</option>
                    <option value="damaged">Damaged</option>
                    <option value="checked">Verified</option>
                  </select>
                </div>
                <div>
                  <label style={LABEL_STYLE}>Notes <span style={{ color: '#CBD5E1', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>optional</span></label>
                  <input
                    type="text"
                    placeholder="Serial number, location, remarks…"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    style={INPUT_STYLE}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 22px',
                    background: saving ? '#94A3B8' : '#0F172A',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: saving ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap',
                    height: '40px',
                  }}
                >
                  <Check size={15} />
                  {saving ? 'Saving…' : editTarget ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── FILTER BAR ── */}
        <div style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}>
          {/* Left: Month + Year + Status chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Month / Year */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #E2E8F0', borderRadius: '9px', padding: '6px 12px', background: '#F8FAFC' }}>
              <Calendar size={14} color="#94A3B8" />
              <select value={month} onChange={e => setMonth(+e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '13px', color: '#0F172A', outline: 'none', cursor: 'pointer' }}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={year} onChange={e => setYear(+e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '13px', color: '#0F172A', outline: 'none', cursor: 'pointer' }}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Status filter chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[['all', 'All'], ['working', 'Working'], ['maintenance', 'Maintenance'], ['damaged', 'Damaged'], ['checked', 'Verified']].map(([key, label]) => (
                <button key={key} onClick={() => setStatusFilter(key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    border: '1px solid',
                    borderColor: statusFilter === key ? '#0F172A' : '#E2E8F0',
                    background: statusFilter === key ? '#0F172A' : '#fff',
                    color: statusFilter === key ? '#fff' : '#64748B',
                    fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search items…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...INPUT_STYLE, width: '230px', paddingLeft: '32px', height: '36px', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* ── TABLE ── */}
        <div style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '80px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
              Loading {MONTHS[month - 1]} {year}…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '70px 20px', textAlign: 'center' }}>
              <Wrench size={36} color="#E2E8F0" style={{ marginBottom: '14px' }} />
              <p style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A', margin: '0 0 6px' }}>No items found</p>
              <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 20px' }}>
                Add your first equipment item for {MONTHS[month - 1]} {year}.
              </p>
              {!showForm && (
                <button onClick={openAdd}
                  style={{ background: '#0F172A', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>
                  + Add Item
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                  {['#', 'Item Name', 'Qty', 'Unit Price', 'Total Value', 'Condition', 'Notes', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '11px 16px',
                      textAlign: i === 0 ? 'center' : i >= 2 && i <= 4 ? 'right' : i === 5 ? 'center' : 'left',
                      fontSize: '10px',
                      fontWeight: 800,
                      color: '#94A3B8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id}
                    style={{ borderBottom: '1px solid #F8FAFC' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFBFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 16px', textAlign: 'center', color: '#CBD5E1', fontWeight: 700, fontSize: '12px' }}>{idx + 1}</td>

                    <td style={{ padding: '13px 16px', fontWeight: 700, color: '#0F172A' }}>
                      {item.item_name}
                    </td>

                    <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 800 }}>
                      {item.quantity}
                    </td>

                    <td style={{ padding: '13px 16px', textAlign: 'right', color: item.price != null ? '#0F172A' : '#CBD5E1', fontWeight: 600 }}>
                      {item.price != null ? `৳${Number(item.price).toLocaleString('en-IN')}` : '—'}
                    </td>

                    <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 800, color: item.price != null ? '#D97706' : '#CBD5E1' }}>
                      {item.price != null ? `৳${(Number(item.price) * Number(item.quantity)).toLocaleString('en-IN')}` : '—'}
                    </td>

                    <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                      <select
                        value={item.status}
                        onChange={e => handleStatusChange(item, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '20px',
                          border: `1px solid ${STATUS_CONFIG[item.status]?.border || '#E2E8F0'}`,
                          background: STATUS_CONFIG[item.status]?.bg || '#F8FAFC',
                          color: STATUS_CONFIG[item.status]?.text || '#475569',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          outline: 'none',
                          appearance: 'none',
                          paddingRight: '18px',
                        }}
                      >
                        <option value="working">Working</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="damaged">Damaged</option>
                        <option value="checked">Verified</option>
                      </select>
                    </td>

                    <td style={{ padding: '13px 16px', color: '#94A3B8', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.notes || '—'}
                    </td>

                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button onClick={() => openEdit(item)}
                        style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '5px 9px', cursor: 'pointer', color: '#475569', marginRight: '6px' }}>
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => handleDelete(item.id)}
                        style={{ background: 'none', border: '1px solid #FECACA', borderRadius: '8px', padding: '5px 9px', cursor: 'pointer', color: '#EF4444' }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ── ACTION PIN (1590) MODAL FOR EDIT / DELETE ── */}
      {actionPinModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999
        }}>
          <div style={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: '20px',
            padding: '36px 32px',
            maxWidth: '360px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
            textAlign: 'center',
            position: 'relative'
          }}>
            <button
              onClick={() => setActionPinModalOpen(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>

            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: '#FEF2F2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Lock size={20} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: '0 0 6px' }}>
              Edit / Delete Security PIN
            </h3>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 20px', lineHeight: 1.5 }}>
              Enter Action PIN to modify or remove checklist records.
            </p>

            <form onSubmit={handleVerifyActionPin}>
              <input
                type="password"
                placeholder="Enter PIN"
                value={actionPinInput}
                onChange={e => { setActionPinInput(e.target.value); setActionPinError(false); }}
                autoFocus
                style={{
                  ...INPUT_STYLE,
                  textAlign: 'center',
                  fontSize: '18px',
                  letterSpacing: '4px',
                  padding: '12px',
                  marginBottom: '12px',
                  border: actionPinError ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0'
                }}
              />
              {actionPinError && (
                <p style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, margin: '-6px 0 12px' }}>
                  Incorrect PIN. Access denied.
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActionPinModalOpen(false)}
                  style={{ flex: 1, padding: '11px', background: '#F1F5F9', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, color: '#64748B', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '11px', background: '#0F172A', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 800, color: '#fff', cursor: 'pointer' }}
                >
                  Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
