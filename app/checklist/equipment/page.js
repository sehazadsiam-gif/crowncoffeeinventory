'use client'

import { useState, useEffect } from 'react'
import Navbar from '../../../components/Navbar'
import Modal from '../../../components/Modal'
import { useToast } from '../../../components/Toast'
import {
  ClipboardList, CheckSquare, Plus, Edit, Trash2, Search,
  Calendar, Lock, ShieldCheck, Download, FileSpreadsheet, FileText,
  AlertCircle, CheckCircle2, Wrench, AlertTriangle, ArrowUpDown, Filter,
  RefreshCw, DollarSign, Package
} from 'lucide-react'
import * as xlsx from 'xlsx'

export default function EquipmentChecklistPage() {
  const { addToast } = useToast()

  // Security Auth State (Manager Password: 456456)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)

  // Data & Filter States
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal States
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formState, setFormState] = useState({
    item_name: '',
    quantity: 1,
    price: '',
    status: 'working',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Check if session is already unlocked
  useEffect(() => {
    const isAuthed = sessionStorage.getItem('cc_mgr_checklist_authed') === 'true'
    if (isAuthed) {
      setIsUnlocked(true)
    }
  }, [])

  // Fetch Equipment Checklist for selected month & year
  useEffect(() => {
    if (isUnlocked) {
      fetchChecklist()
    }
  }, [isUnlocked, month, year])

  async function handleVerifyPin(e) {
    if (e) e.preventDefault()
    if (!pinInput.trim()) return

    setPinLoading(true)
    setPinError(false)
    try {
      const res = await fetch('/api/checklist/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() })
      })
      const json = await res.json()

      if (res.ok && json.success) {
        sessionStorage.setItem('cc_mgr_checklist_authed', 'true')
        setIsUnlocked(true)
        addToast('Manager Access Unlocked', 'success')
      } else {
        setPinError(true)
        addToast(json.error || 'Invalid Manager Password', 'error')
      }
    } catch (err) {
      setPinError(true)
      addToast('Error verifying password', 'error')
    } finally {
      setPinLoading(false)
    }
  }

  async function fetchChecklist() {
    try {
      setLoading(true)
      const res = await fetch(`/api/checklist/equipment?month=${month}&year=${year}`)
      const json = await res.json()
      if (res.ok) {
        setItems(json.items || [])
      } else {
        addToast(json.error || 'Failed to load equipment checklist', 'error')
      }
    } catch (err) {
      addToast('Error fetching checklist data', 'error')
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingItem(null)
    setFormState({
      item_name: '',
      quantity: 1,
      price: '',
      status: 'working',
      notes: ''
    })
    setItemModalOpen(true)
  }

  function openEditModal(item) {
    setEditingItem(item)
    setFormState({
      item_name: item.item_name || '',
      quantity: item.quantity || 1,
      price: item.price !== null && item.price !== undefined ? item.price : '',
      status: item.status || 'working',
      notes: item.notes || ''
    })
    setItemModalOpen(true)
  }

  async function handleSaveItem(e) {
    e.preventDefault()
    if (!formState.item_name.trim()) {
      addToast('Item name is required', 'error')
      return
    }
    if (Number(formState.quantity) < 1) {
      addToast('Quantity must be at least 1', 'error')
      return
    }

    try {
      setSubmitting(true)
      const isEdit = !!editingItem
      const url = '/api/checklist/equipment'
      const method = isEdit ? 'PUT' : 'POST'

      const body = {
        ...formState,
        month,
        year,
        id: isEdit ? editingItem.id : undefined
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const json = await res.json()

      if (res.ok && json.success) {
        addToast(json.message || (isEdit ? 'Item updated' : 'Item added'), 'success')
        setItemModalOpen(false)
        fetchChecklist()
      } else {
        addToast(json.error || 'Failed to save item', 'error')
      }
    } catch (err) {
      addToast('Network error saving item', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleQuickStatusChange(item, newStatus) {
    try {
      const res = await fetch('/api/checklist/equipment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: newStatus })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        addToast(`Status updated to ${newStatus.toUpperCase()}`, 'success')
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
      } else {
        addToast(json.error || 'Failed to update status', 'error')
      }
    } catch (err) {
      addToast('Error updating status', 'error')
    }
  }

  async function handleDeleteItem(id) {
    if (!confirm('Are you sure you want to remove this equipment item?')) return
    try {
      const res = await fetch(`/api/checklist/equipment?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok) {
        addToast('Equipment item deleted', 'info')
        setItems(prev => prev.filter(i => i.id !== id))
      } else {
        addToast(json.error || 'Failed to delete item', 'error')
      }
    } catch (err) {
      addToast('Error deleting item', 'error')
    }
  }

  // Export Excel
  function handleExportExcel() {
    if (items.length === 0) {
      addToast('No items to export', 'error')
      return
    }

    const exportRows = filteredItems.map((item, idx) => ({
      '#': idx + 1,
      'Item Name': item.item_name,
      'Quantity': item.quantity,
      'Unit Price (BDT)': item.price !== null ? item.price : 'N/A',
      'Total Value (BDT)': item.price !== null ? item.price * item.quantity : 'N/A',
      'Condition Status': item.status.toUpperCase(),
      'Notes': item.notes || ''
    }))

    const worksheet = xlsx.utils.json_to_sheet(exportRows)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Equipment Checklist')

    const filename = `CrownCoffee_Equipment_Checklist_${months[month - 1]}_${year}.xlsx`
    xlsx.writeFile(workbook, filename)
    addToast('Excel report downloaded', 'success')
  }

  // Filter & Search Logic
  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === '' ||
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // KPI Calculations
  const totalItemsCount = items.length
  const totalUnitsQuantity = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
  const totalValuation = items.reduce((sum, i) => sum + (i.price !== null ? Number(i.price) * Number(i.quantity) : 0), 0)

  // 🔒 Render Lock Screen Modal if Manager authentication is required
  if (!isUnlocked) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          background: 'rgba(30, 41, 59, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '40px 36px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #7C3A1E 0%, #D4933A 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 24px rgba(212, 147, 58, 0.3)'
          }}>
            <Lock size={28} color="white" />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Manager Authentication
          </h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 28px', lineHeight: 1.5 }}>
            Access to the <strong>Equipments Check-List</strong> requires Manager Password authorization.
          </p>

          <form onSubmit={handleVerifyPin}>
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#CBD5E1', marginBottom: '8px', letterSpacing: '0.05em' }}>
                Manager Password
              </label>
              <input
                type="password"
                placeholder="Enter password..."
                value={pinInput}
                onChange={e => { setPinInput(e.target.value); setPinError(false); }}
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: pinError ? '2px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'white',
                  fontSize: '18px',
                  letterSpacing: '4px',
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {pinError && (
                <span style={{ display: 'block', color: '#F87171', fontSize: '12px', marginTop: '6px', fontWeight: 600 }}>
                  ❌ Incorrect Password. Please try again.
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={pinLoading}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #D4933A 0%, #B87B28 100%)',
                color: '#0F172A',
                fontWeight: 900,
                fontSize: '15px',
                cursor: pinLoading ? 'wait' : 'pointer',
                boxShadow: '0 4px 16px rgba(212, 147, 58, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              {pinLoading ? 'Verifying…' : 'Unlock Check-List'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // 🟢 Render Full Ultra-Professional Equipment Checklist Workspace
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Navbar />

      <main style={{ maxWidth: '1520px', margin: '0 auto', padding: '32px 24px 60px' }}>
        
        {/* Header Title Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '28px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: '#D4933A',
                padding: '8px 12px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 900,
                fontSize: '14px'
              }}>
                <ClipboardList size={18} /> CHECK-LIST
              </div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', background: '#E2E8F0', padding: '4px 10px', borderRadius: '14px' }}>
                Manager Access Unlocked
              </span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
              Equipments Check-List
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
              Monthly equipment tracking, condition audit, and valuation ledger.
            </p>
          </div>

          {/* Actions & Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportExcel}
              style={{
                background: '#0F172A',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(15,23,42,0.15)'
              }}
            >
              <FileSpreadsheet size={16} /> Export Excel
            </button>

            <button
              onClick={openCreateModal}
              style={{
                background: 'linear-gradient(135deg, #D4933A 0%, #B87B28 100%)',
                color: '#0F172A',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(212, 147, 58, 0.3)'
              }}
            >
              <Plus size={18} /> Add Equipment Item
            </button>
          </div>
        </div>

        {/* Section Tabs (1. Equipments Check-List) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #E2E8F0', paddingBottom: '12px' }}>
          <button style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: '#0F172A',
            color: 'white',
            fontWeight: 800,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}>
            <Wrench size={16} color="#D4933A" /> 1. Equipments Check-List ({items.length})
          </button>
        </div>

        {/* KPI Top Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}>
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>Equipment Types</span>
              <div style={{ background: '#F1F5F9', color: '#0F172A', padding: '8px', borderRadius: '10px' }}><Wrench size={18} /></div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A' }}>{totalItemsCount}</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Registered for {months[month - 1]}</div>
          </div>

          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>Total Units (Qty)</span>
              <div style={{ background: '#EFF6FF', color: '#2563EB', padding: '8px', borderRadius: '10px' }}><Package size={18} /></div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#2563EB' }}>{totalUnitsQuantity}</div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Total individual equipment pieces</div>
          </div>

          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.05em' }}>Est. Total Valuation</span>
              <div style={{ background: '#FEF3C7', color: '#D97706', padding: '8px', borderRadius: '10px' }}><DollarSign size={18} /></div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#D97706' }}>
              ৳{totalValuation.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Sum of priced equipment items</div>
          </div>
        </div>

        {/* Month Selector & Filter Toolbar */}
        <div style={{
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          {/* Month & Year Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '8px 14px', borderRadius: '10px', border: '1px solid #CBD5E1' }}>
              <Calendar size={16} color="#64748B" />
              <select
                value={month}
                onChange={e => setMonth(parseInt(e.target.value))}
                style={{ border: 'none', background: 'transparent', fontWeight: 800, fontSize: '13px', color: '#0F172A', outline: 'none', cursor: 'pointer' }}
              >
                {months.map((m, idx) => (
                  <option key={idx} value={idx + 1}>{m}</option>
                ))}
              </select>

              <select
                value={year}
                onChange={e => setYear(parseInt(e.target.value))}
                style={{ border: 'none', background: 'transparent', fontWeight: 800, fontSize: '13px', color: '#0F172A', outline: 'none', cursor: 'pointer' }}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Condition Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '10px' }}>
              {[
                ['all', 'All'],
                ['working', 'Working 🟢'],
                ['maintenance', 'Maintenance 🟠'],
                ['damaged', 'Damaged 🔴'],
                ['checked', 'Verified 🔵']
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    border: 'none',
                    background: statusFilter === key ? '#0F172A' : 'transparent',
                    color: statusFilter === key ? 'white' : '#64748B',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search equipment name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Equipment Table */}
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          {loading ? (
            <div style={{ padding: '80px', textAlign: 'center', color: '#94A3B8', fontSize: '14px', fontWeight: 600 }}>
              Loading equipment checklist for {months[month - 1]} {year}…
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
              <Wrench size={40} color="#CBD5E1" style={{ marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>No Equipment Items Found</h3>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#94A3B8' }}>
                No equipment records found for {months[month - 1]} {year}. Click below to add the first item.
              </p>
              <button
                onClick={openCreateModal}
                style={{
                  background: '#0F172A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                + Add Equipment Item
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#0F172A', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '14px 16px', width: '50px' }}>#</th>
                    <th style={{ padding: '14px 16px' }}>Equipment Item Name</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>Quantity</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Price (BDT)</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total Value</th>
                    <th style={{ padding: '14px 16px', textAlign: 'center' }}>Condition Status</th>
                    <th style={{ padding: '14px 16px' }}>Notes</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const statusBadges = {
                      working: { label: 'Working 🟢', bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' },
                      maintenance: { label: 'Needs Maintenance 🟠', bg: '#FEF3C7', text: '#B45309', border: '#FCD34D' },
                      damaged: { label: 'Damaged 🔴', bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' },
                      checked: { label: 'Verified 🔵', bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' }
                    }
                    const badge = statusBadges[item.status] || statusBadges.working

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#94A3B8' }}>{idx + 1}</td>
                        <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0F172A' }}>
                          {item.item_name}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '3px 10px', borderRadius: '10px', fontWeight: 900, fontSize: '13px' }}>
                            {item.quantity}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: item.price !== null ? '#0F172A' : '#94A3B8' }}>
                          {item.price !== null ? `৳${Number(item.price).toLocaleString('en-IN')}` : 'Optional'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: item.price !== null ? '#D97706' : '#94A3B8' }}>
                          {item.price !== null ? `৳${(Number(item.price) * Number(item.quantity)).toLocaleString('en-IN')}` : '--'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <select
                            value={item.status}
                            onChange={e => handleQuickStatusChange(item, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              border: `1px solid ${badge.border}`,
                              background: badge.bg,
                              color: badge.text,
                              fontWeight: 800,
                              fontSize: '11px',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="working">Working 🟢</option>
                            <option value="maintenance">Needs Maintenance 🟠</option>
                            <option value="damaged">Damaged 🔴</option>
                            <option value="checked">Verified 🔵</option>
                          </select>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.notes || '—'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => openEditModal(item)}
                              style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '7px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Edit size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '7px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Equipment Item Modal */}
      {itemModalOpen && (
        <Modal
          isOpen={itemModalOpen}
          onClose={() => setItemModalOpen(false)}
          title={editingItem ? 'Edit Equipment Item' : 'Add New Equipment Item'}
        >
          <form onSubmit={handleSaveItem}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  Equipment Item Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Espresso Machine E61, Grinder, POS Terminal"
                  value={formState.item_name}
                  onChange={e => setFormState({ ...formState, item_name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                    Quantity (Units) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formState.quantity}
                    onChange={e => setFormState({ ...formState, quantity: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                    Price (BDT) <span style={{ color: '#64748B', fontWeight: 500 }}>(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 150000"
                    value={formState.price}
                    onChange={e => setFormState({ ...formState, price: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  Condition Status
                </label>
                <select
                  value={formState.status}
                  onChange={e => setFormState({ ...formState, status: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="working">Working 🟢</option>
                  <option value="maintenance">Needs Maintenance 🟠</option>
                  <option value="damaged">Damaged 🔴</option>
                  <option value="checked">Verified 🔵</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  Notes / Specification <span style={{ color: '#64748B', fontWeight: 500 }}>(Optional)</span>
                </label>
                <textarea
                  rows="3"
                  placeholder="Additional notes, serial numbers, or condition remarks..."
                  value={formState.notes}
                  onChange={e => setFormState({ ...formState, notes: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  style={{ background: '#F1F5F9', border: 'none', color: '#475569', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: '#0F172A', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, cursor: submitting ? 'wait' : 'pointer' }}
                >
                  {submitting ? 'Saving…' : editingItem ? 'Update Equipment' : 'Save Equipment'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
