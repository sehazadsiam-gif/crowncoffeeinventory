'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Power,
  RotateCcw,
  Check,
  X,
  Package,
  BookOpen,
  ClipboardList,
  MessageSquare,
  Users,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Trash2,
  Calendar,
  Hand,
  Settings,
  Calculator,
  ShoppingBag,
  Clock,
  UserCheck
} from 'lucide-react'
import Sidebar from '../../../components/Sidebar'
import { DEFAULT_FEATURE_FLAGS } from '../../../hooks/useFeatureFlags'

// Metadata for every single individual feature item
const FEATURE_ITEMS = [
  // Inventory & Stock
  { key: 'inventory_manager', label: 'Stock Manager', category: 'Inventory & Stock', path: '/stock', icon: Package, desc: 'Track stock inventory levels & alerts' },
  { key: 'stock_import', label: 'Stock Import', category: 'Inventory & Stock', path: '/stock-import', icon: Package, desc: 'Excel/CSV bulk stock importer' },
  { key: 'stock_audit', label: 'Stock Audit & Costing', category: 'Inventory & Stock', path: '/stock-audit', icon: Calculator, desc: 'Monthly bazar ratio & variance audit' },

  // Menu & Engineering
  { key: 'menu_list', label: 'Menu List', category: 'Menu & Recipes', path: '/menu', icon: BookOpen, desc: 'Public and internal menu item list' },
  { key: 'menu_import', label: 'Menu Import', category: 'Menu & Recipes', path: '/menu-import', icon: BookOpen, desc: 'Bulk import menu items from spreadsheet' },
  { key: 'menu_engineering', label: 'Menu Engineering & Costing', category: 'Menu & Recipes', path: '/admin/menu-engineering', icon: BookOpen, desc: 'COGS, recipe margins & profitability' },
  { key: 'recipebook', label: 'Recipe Book', category: 'Menu & Recipes', path: '/recipebook', icon: BookOpen, desc: 'Online recipe book & PDF exporter' },

  // Operations & Audits
  { key: 'bazar', label: 'Bazar Expenses', category: 'Operations & Expenses', path: '/bazar', icon: ClipboardList, desc: 'Log daily bazar purchases & expenses' },
  { key: 'sales_audit', label: 'Daily Sales Audit', category: 'Operations & Expenses', path: '/sales-reconciliation', icon: ShieldAlert, desc: 'AI sales & cash reconciliation audit' },
  { key: 'waste', label: 'Waste Tracking', category: 'Operations & Expenses', path: '/waste', icon: Trash2, desc: 'Record food & beverage wasted items' },
  { key: 'checklist', label: 'Equipment Checklist', category: 'Operations & Expenses', path: '/checklist/equipment', icon: ClipboardList, desc: 'Daily equipment verification checklist' },

  // Staff & HR
  { key: 'staff_directory', label: 'Staff Directory & ID Cards', category: 'Staff & HR', path: '/admin/staff', icon: Users, desc: 'Staff employee list & ID badges' },
  { key: 'attendance_live', label: 'Live Attendance & RFID Kiosk', category: 'Staff & HR', path: '/attendance', icon: UserCheck, desc: 'Live RFID attendance tracking' },
  { key: 'attendance_public', label: 'Public Attendance Kiosk', category: 'Staff & HR', path: '/public-attendance', icon: UserCheck, desc: 'Staff self-service attendance kiosk' },
  { key: 'attendance_reports', label: 'Attendance Reports', category: 'Staff & HR', path: '/attendance/reports', icon: Calendar, desc: 'Detailed attendance logs & exports' },
  { key: 'leave_requests', label: 'Duty & Leave Requests', category: 'Staff & HR', path: '/attendance/requests', icon: Calendar, desc: 'Review & approve staff leave applications' },
  { key: 'payroll', label: 'Payroll Ledger', category: 'Staff & HR', path: '/staff/payroll', icon: DollarSign, desc: 'Salary calculation & payslip generator' },
  { key: 'advances', label: 'Staff Advances', category: 'Staff & HR', path: '/staff/advances', icon: Hand, desc: 'Salary advance loans & repayments' },
  { key: 'service_charge', label: 'Service Charge', category: 'Staff & HR', path: '/staff/service-charge', icon: Settings, desc: 'Distribute monthly service charge pool' },
  { key: 'tasks', label: 'Assign Tasks', category: 'Staff & HR', path: '/admin/tasks', icon: ClipboardList, desc: 'Task allocation & staff task tracking' },
  { key: 'overtime', label: 'Overtime Management', category: 'Staff & HR', path: '/admin/overtime', icon: Clock, desc: 'Log & calculate staff overtime hours' },

  // Customers & Finance
  { key: 'feedbacks', label: 'Guest Feedbacks & Ratings', category: 'Customers & POS', path: '/guest-feedbacks', icon: MessageSquare, desc: 'Customer reviews, ratings & feedback' },
  { key: 'members', label: 'Membership System', category: 'Customers & POS', path: '/admin/members', icon: Users, desc: 'VIP membership registration & lookup' },
  { key: 'balance_sheet', label: 'Balance Sheet', category: 'Customers & POS', path: '/balance-sheet', icon: TrendingUp, desc: 'Financial balance & profit summary' },
  { key: 'pos', label: 'POS System', category: 'Customers & POS', path: '/pos', icon: ShoppingBag, desc: 'Point of sale billing system' }
]

export default function AdminFeaturesPage() {
  const [flags, setFlags] = useState(DEFAULT_FEATURE_FLAGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchFlags()
  }, [])

  const fetchFlags = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/feature-flags')
      const json = await res.json()
      if (json.success && json.data) {
        setFlags({ ...DEFAULT_FEATURE_FLAGS, ...json.data })
        localStorage.setItem('cc_feature_flags', JSON.stringify({ ...DEFAULT_FEATURE_FLAGS, ...json.data }))
      }
    } catch (err) {
      console.warn('Fallback to cached feature flags:', err)
      const cached = localStorage.getItem('cc_feature_flags')
      if (cached) {
        try { setFlags({ ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(cached) }) } catch (e) {}
      }
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const toggleFlag = (key) => {
    setFlags((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleEnableAll = () => {
    const allEnabled = {}
    FEATURE_ITEMS.forEach((item) => {
      allEnabled[item.key] = true
    })
    setFlags(allEnabled)
  }

  const handleDisableAll = () => {
    const allDisabled = {}
    FEATURE_ITEMS.forEach((item) => {
      allDisabled[item.key] = false
    })
    setFlags(allDisabled)
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flags })
      })
      const json = await res.json()
      if (json.success) {
        localStorage.setItem('cc_feature_flags', JSON.stringify(flags))
        window.dispatchEvent(new Event('feature-flags-updated'))
        showToast('Feature settings saved successfully!')
      } else {
        localStorage.setItem('cc_feature_flags', JSON.stringify(flags))
        window.dispatchEvent(new Event('feature-flags-updated'))
        showToast('Saved to browser cache.')
      }
    } catch (err) {
      console.error('Error saving feature flags:', err)
      localStorage.setItem('cc_feature_flags', JSON.stringify(flags))
      window.dispatchEvent(new Event('feature-flags-updated'))
      showToast('Saved locally.')
    } finally {
      setSaving(false)
    }
  }

  // Filter items by search term
  const filteredItems = FEATURE_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.path.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group by category
  const categories = Array.from(new Set(FEATURE_ITEMS.map((item) => item.category)))

  const activeCount = Object.values(flags).filter(Boolean).length
  const totalCount = FEATURE_ITEMS.length

  return (
    <div style={{ minHeight: '100vh', background: '#F9F6F0', display: 'flex', fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <Sidebar role="admin" currentPage="/admin/features" staffName="Administrator" />

      {/* Main Content Area */}
      <div style={{ flex: 1, marginLeft: '240px', padding: '32px 40px', maxWidth: '1400px' }}>
        
        {/* Toast Notification */}
        {toast && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#1C1410',
            color: '#C9943A',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 2000,
            fontWeight: '600',
            fontSize: '14px'
          }}>
            <CheckCircle2 size={18} /> {toast}
          </div>
        )}

        {/* Page Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#6B3A2A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C9943A'
              }}>
                <Sliders size={22} />
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#1C1410', margin: 0, letterSpacing: '-0.02em' }}>
                Feature Flags Manager
              </h1>
            </div>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              Toggle individual features ON or OFF to customize what appears on your Dashboard, Navbar, and Sidebar.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              style={{
                background: 'linear-gradient(135deg, #C9943A 0%, #A87624 100%)',
                color: '#1C1410',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(201, 148, 58, 0.35)',
                transition: 'transform 0.2s'
              }}
            >
              <Check size={18} /> {saving ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Controls Bar */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '28px',
          border: '1px solid #EBE7DF',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '320px', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input
              type="text"
              placeholder="Search feature by name or path..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 42px',
                borderRadius: '10px',
                border: '1px solid #DDD',
                fontSize: '14px',
                outline: 'none',
                background: '#FAF8F5'
              }}
            />
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#444' }}>
              Active: <span style={{ color: '#059669' }}>{activeCount}</span> / {totalCount}
            </span>

            <button
              onClick={handleEnableAll}
              style={{
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Enable All
            </button>

            <button
              onClick={handleDisableAll}
              style={{
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FCA5A5',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Disable All
            </button>
          </div>
        </div>

        {/* Feature Cards Grid by Category */}
        {categories.map((cat) => {
          const itemsInCat = filteredItems.filter((i) => i.category === cat)
          if (itemsInCat.length === 0) return null

          return (
            <div key={cat} style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#6B3A2A', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C9943A' }}></span>
                {cat}
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px'
              }}>
                {itemsInCat.map((item) => {
                  const active = flags[item.key] !== false
                  const IconComp = item.icon

                  return (
                    <div
                      key={item.key}
                      style={{
                        background: 'white',
                        borderRadius: '14px',
                        border: active ? '1.5px solid #C9943A' : '1px solid #E5E0D8',
                        padding: '18px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease',
                        opacity: active ? 1 : 0.65
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: active ? 'rgba(201, 148, 58, 0.15)' : '#F0ECE3',
                              color: active ? '#6B3A2A' : '#888',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <IconComp size={18} />
                            </div>
                            <div>
                              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1C1410', margin: 0 }}>
                                {item.label}
                              </h3>
                              <span style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
                                {item.path}
                              </span>
                            </div>
                          </div>

                          {/* Toggle Switch */}
                          <div
                            onClick={() => toggleFlag(item.key)}
                            style={{
                              width: '48px',
                              height: '26px',
                              borderRadius: '13px',
                              background: active ? '#059669' : '#D1D5DB',
                              padding: '3px',
                              cursor: 'pointer',
                              transition: 'background 0.25s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: active ? 'flex-end' : 'flex-start'
                            }}
                          >
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: 'white',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                          </div>
                        </div>

                        <p style={{ fontSize: '12px', color: '#555', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                          {item.desc}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #F5F2EC' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: active ? '#059669' : '#6B7280',
                          background: active ? '#ECFDF5' : '#F3F4F6',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {active ? '● Visible' : '○ Hidden'}
                        </span>

                        {active && (
                          <Link href={item.path} style={{ fontSize: '11px', fontWeight: '600', color: '#6B3A2A', textDecoration: 'none' }}>
                            Open Route →
                          </Link>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}
