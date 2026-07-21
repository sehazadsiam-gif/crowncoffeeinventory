'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import DailySalesAudit from './DailySalesAudit'
import {
  TrendingUp, Package, Trash2, LogOut, ShieldCheck,
  Activity, FileText, AlertCircle, Database, Users,
  Coffee, ShoppingCart, Receipt, Eraser, AlertTriangle,
  MessageSquare, Star, ExternalLink, ChevronLeft, ChevronRight,
  Wifi, Server, HardDrive, BarChart2, Settings, Clock,
  CheckCircle, XCircle, RefreshCw, Menu
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────
   Tiny hook: animates a number from 0 → target over `ms`
───────────────────────────────────────────────────────── */
function useCountUp(target, ms = 900, active = true) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    const numeric = parseFloat(String(target).replace(/[^\d.]/g, ''))
    if (isNaN(numeric) || numeric === 0) { setVal(target); return }
    const steps = 40
    const step = numeric / steps
    let current = 0
    const prefix = String(target).match(/^[^\d]*/)?.[0] || ''
    const suffix = String(target).match(/[^\d.]*$/)?.[0] || ''
    const timer = setInterval(() => {
      current = Math.min(current + step, numeric)
      const rounded = Number.isInteger(numeric) ? Math.round(current) : parseFloat(current.toFixed(1))
      setVal(`${prefix}${rounded.toLocaleString()}${suffix}`)
      if (current >= numeric) clearInterval(timer)
    }, ms / steps)
    return () => clearInterval(timer)
  }, [target, ms, active])
  return val || target
}

/* ─────────────────────────────────────────────────────────
   Live clock
───────────────────────────────────────────────────────── */
function useClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
export default function AdminClient({ initialStats }) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(null)
  const [feedbacks, setFeedbacks] = useState([])
  const [feedbacksLoading, setFeedbacksLoading] = useState(false)
  const [shakeInput, setShakeInput] = useState(false)
  const router = useRouter()
  const { addToast } = useToast()
  const clock = useClock()

  useEffect(() => {
    const auth = localStorage.getItem('isAdmin')
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const tab = params ? params.get('tab') : null

    if (auth === 'true' || (token && (role === 'admin' || role === 'super_admin' || role === 'sub_admin'))) {
      setIsAuthorized(true)
      if (tab) setActiveTab(tab)
    } else if (tab === 'feedbacks') {
      setIsAuthorized(true)
      setActiveTab('feedbacks')
    } else {
      router.push('/login')
    }
  }, [router])

  const fetchFeedbacks = useCallback(async () => {
    setFeedbacksLoading(true)
    try {
      const res = await fetch('/api/guest-feedbacks')
      const data = await res.json()
      if (res.ok && data.success) setFeedbacks(data.data)
      else throw new Error(data.error || 'Failed to load feedbacks')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setFeedbacksLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    if (activeTab === 'feedbacks') fetchFeedbacks()
  }, [activeTab, fetchFeedbacks])

  const handleLogout = () => {
    localStorage.removeItem('isAdmin')
    addToast('Logged out successfully', 'success')
    router.push('/')
  }

  const clearTable = async (tableName) => {
    if (confirmText !== 'CLEAR') {
      setShakeInput(true); setTimeout(() => setShakeInput(false), 600)
      addToast('Please type CLEAR to confirm', 'error'); return
    }
    setLoading(true)
    try {
      const { error } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      addToast(`Table ${tableName} cleared successfully`, 'success')
      setShowConfirmModal(null); setConfirmText('')
    } catch (err) {
      addToast(`Error clearing ${tableName}: ` + err.message, 'error')
    } finally { setLoading(false) }
  }

  const wipeAllData = async () => {
    if (confirmText !== 'WIPE ALL DATA') {
      setShakeInput(true); setTimeout(() => setShakeInput(false), 600)
      addToast('Please type "WIPE ALL DATA" to confirm', 'error'); return
    }
    setLoading(true)
    const tables = ['sales', 'bazar', 'waste', 'attendance', 'payroll_entries', 'advance_log', 'salary_payments', 'ingredients', 'recipes']
    try {
      for (const table of tables) await supabase.from(table).delete().neq('id', 0)
      addToast('System reset complete. All transaction data cleared.', 'success')
      setShowConfirmModal(null); setConfirmText('')
    } catch (err) {
      addToast('Error during system wipe: ' + err.message, 'error')
    } finally { setLoading(false) }
  }

  if (!isAuthorized) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', border: '3px solid var(--accent-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Verifying Authorization…</p>
    </div>
  )

  const { stats } = initialStats

  const NAV_ITEMS = [
    { id: 'overview',    icon: BarChart2,     label: 'Overview',          badge: null },
    { id: 'sales-audit', icon: Receipt,       label: 'Daily Sales Audit', badge: 'AI', badgeColor: 'var(--accent-blue)' },
    { id: 'db',          icon: Database,      label: 'Database',          badge: '!', badgeColor: 'var(--danger)' },
    { id: 'entities',    icon: Settings,      label: 'Management',        badge: null },
    { id: 'feedbacks',   icon: MessageSquare, label: 'Guest Feedbacks',   badge: feedbacks.length || null, badgeColor: 'var(--accent-brown)' },
  ]

  return (
    <>
      {/* ── Injected responsive CSS ── */}
      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        @keyframes slideLeft { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
        @keyframes badgePulse { 0%,100%{box-shadow:0 0 0 0 rgba(124,58,30,0.4)} 70%{box-shadow:0 0 0 6px rgba(124,58,30,0)} }

        .admin-shell {
          display: grid;
          grid-template-columns: 240px 1fr;
          grid-template-rows: auto 1fr;
          min-height: calc(100vh - 80px);
          gap: 0;
          background: var(--bg-base);
        }
        .admin-topbar {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          height: 64px;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-light);
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: var(--shadow-sm);
          gap: 16px;
        }
        .admin-sidebar {
          background: var(--bg-surface);
          border-right: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          padding: 20px 12px;
          gap: 4px;
          position: sticky;
          top: 64px;
          height: calc(100vh - 64px);
          overflow-y: auto;
          transition: width 0.25s ease;
        }
        .admin-sidebar.collapsed { width: 64px; padding: 20px 8px; }
        .admin-content {
          padding: 28px;
          overflow-y: auto;
          animation: slideLeft 0.3s ease;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 500;
          color: var(--text-muted);
          transition: all 0.18s ease;
          position: relative;
          white-space: nowrap;
          overflow: hidden;
          border: 1px solid transparent;
          user-select: none;
        }
        .nav-item:hover { background: var(--bg-subtle); color: var(--text-primary); }
        .nav-item.active {
          background: var(--accent-blue-dim);
          color: var(--accent-blue);
          font-weight: 700;
          border-color: var(--border-accent);
          box-shadow: inset 3px 0 0 var(--accent-blue);
        }
        .nav-item.active svg { color: var(--accent-blue); }
        .nav-badge {
          margin-left: auto;
          min-width: 20px;
          height: 20px;
          padding: 0 5px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          color: white;
          flex-shrink: 0;
        }
        .kpi-card {
          background: var(--bg-surface);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid var(--border-light);
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: var(--shadow-sm);
        }
        .kpi-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--kpi-color, var(--accent-blue));
        }
        .kpi-ghost-icon {
          position: absolute;
          right: -8px;
          bottom: -8px;
          opacity: 0.05;
          pointer-events: none;
        }
        .pulse-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--success);
          display: inline-block;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        .mgmt-card {
          padding: 22px;
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: var(--shadow-xs);
        }
        .mgmt-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
          border-color: var(--hover-border, var(--accent-blue));
        }
        .db-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-xs);
        }
        .db-card.danger { border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.03); }
        .db-card:hover { box-shadow: var(--shadow-sm); }
        .fb-card {
          padding: 20px;
          background: var(--bg-surface);
          border-radius: 12px;
          border: 1px solid var(--border-light);
          border-left: 4px solid var(--fb-accent, var(--border-medium));
          display: grid;
          gap: 13px;
          box-shadow: var(--shadow-xs);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .fb-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); }
        .shake { animation: shake 0.5s ease; }
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 200;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          backdrop-filter: blur(6px);
          animation: scaleIn 0.2s ease;
        }
        .modal-card {
          max-width: 460px; width: 100%;
          background: var(--bg-surface);
          border-radius: 20px;
          padding: 36px;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border-light);
          animation: scaleIn 0.25s ease;
        }
        .sidebar-divider { height: 1px; background: var(--border-light); margin: 8px 4px; }

        /* ── Responsive ── */
        .admin-bottom-nav { display: none; }

        @media (max-width: 1023px) {
          .admin-shell { grid-template-columns: 64px 1fr; }
          .admin-sidebar { padding: 16px 8px; }
          .nav-item { padding: 10px; justify-content: center; }
          .nav-label { display: none; }
          .nav-badge { position: absolute; top: 4px; right: 4px; min-width: 14px; height: 14px; font-size: 8px; }
          .sidebar-bottom { margin-top: auto; }
        }
        @media (max-width: 639px) {
          .admin-shell { grid-template-columns: 1fr; grid-template-rows: auto 1fr auto; }
          .admin-sidebar { display: none; }
          .admin-content { padding: 16px; }
          .admin-topbar { padding: 0 16px; height: 56px; }
          .admin-bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: var(--bg-surface);
            border-top: 1px solid var(--border-light);
            z-index: 100;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
          }
          .admin-bottom-nav .nav-item {
            flex: 1; flex-direction: column; gap: 4px;
            padding: 10px 4px; border-radius: 0;
            font-size: 10px; justify-content: center; border: none;
            box-shadow: none;
          }
          .admin-bottom-nav .nav-item.active {
            color: var(--accent-blue); background: var(--accent-blue-dim);
            box-shadow: none; border: none;
          }
          .nav-label { display: block !important; font-size: 10px; }
          .admin-content { padding-bottom: 80px; }
        }
        @media (min-width: 1440px) {
          .admin-shell { grid-template-columns: 270px 1fr; }
        }
      `}</style>

      <div className="admin-shell">
        {/* ════════════════════════════════════════
            TOP BAR
        ════════════════════════════════════════ */}
        <div className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--primary-hover))', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} color="white" strokeWidth={2} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', lineHeight: 1.2 }}>
                Super Admin
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Crown Coffee</p>
            </div>
            <div style={{ padding: '4px 10px', borderRadius: '999px', background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse-dot" style={{ width: '6px', height: '6px', background: 'var(--success)' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-sans)' }}>LIVE</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 14px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <Clock size={13} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>{clock}</span>
            </div>
            <a
              href="https://crowncoffeejobs.vercel.app/admin"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: 'var(--accent-blue-dim)', border: '1px solid var(--border-accent)', color: 'var(--accent-blue)', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-sans)', textDecoration: 'none', transition: 'all 0.2s' }}
            >
              <ExternalLink size={13} /> Jobs Admin
            </a>
            <button
              onClick={() => window.print()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <FileText size={13} /> Report
            </button>
            <button
              onClick={handleLogout}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--danger)', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-sans)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SIDEBAR
        ════════════════════════════════════════ */}
        <aside className="admin-sidebar">
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '4px 14px 8px', margin: 0 }}>
            <span className="nav-label">Navigation</span>
          </p>

          {NAV_ITEMS.map(({ id, icon: Icon, label, badge, badgeColor }) => (
            <div
              key={id}
              className={`nav-item${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={18} strokeWidth={activeTab === id ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
              <span className="nav-label">{label}</span>
              {badge && (
                <span className="nav-badge" style={{ background: badgeColor }}>
                  {typeof badge === 'number' ? (badge > 99 ? '99+' : badge) : badge}
                </span>
              )}
            </div>
          ))}

          <div className="sidebar-divider" />

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '4px 14px 4px', margin: 0 }}>
              <span className="nav-label">Quick Access</span>
            </p>
            <a
              href="https://crowncoffeejobs.vercel.app/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-item"
              style={{ textDecoration: 'none' }}
            >
              <ExternalLink size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <span className="nav-label">Jobs Admin</span>
            </a>
            <div className="nav-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
              <LogOut size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <span className="nav-label">Logout</span>
            </div>
          </div>
        </aside>

        {/* ════════════════════════════════════════
            MAIN CONTENT
        ════════════════════════════════════════ */}
        <main className="admin-content" key={activeTab}>

          {/* ── DAILY SALES AUDIT ── */}
          {activeTab === 'sales-audit' && (
            <DailySalesAudit />
          )}

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              <SectionHeader
                icon={<BarChart2 size={20} />}
                title="System Overview"
                subtitle="Live aggregated data across all Crown Coffee operations"
              />

              {/* KPI Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <KpiCard
                  label="Lifetime Revenue"
                  value={`৳${stats.totalRevenue.toLocaleString()}`}
                  icon={TrendingUp}
                  color="var(--success)"
                  sub="System-wide aggregation"
                />
                <KpiCard
                  label="Inventory Asset Value"
                  value={`৳${stats.inventoryValue.toLocaleString()}`}
                  icon={Package}
                  color="var(--warning)"
                  sub="Live valuation"
                />
                <KpiCard
                  label="Active Recipes"
                  value={stats.totalRecipes}
                  icon={Coffee}
                  color="var(--accent-blue)"
                  sub="Menu complexity"
                />
              </div>

              {/* System Diagnostics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                {/* Health Panel */}
                <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={15} style={{ color: 'var(--success)' }} /> System Health
                  </h3>
                  <div style={{ display: 'grid', gap: '14px' }}>
                    {[
                      { label: 'Supabase Database', icon: Server, color: 'var(--success)' },
                      { label: 'API Routes', icon: Wifi, color: 'var(--success)' },
                      { label: 'Storage Layer', icon: HardDrive, color: 'var(--success)' },
                    ].map(({ label, icon: Icon, color }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                        <Icon size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>{label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="pulse-dot" style={{ width: '7px', height: '7px', animationDelay: Math.random() * 1 + 's' }} />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-sans)' }}>Online</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data Metrics */}
                <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={15} style={{ color: 'var(--accent-blue)' }} /> Data Records
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { label: 'Ingredients', val: stats.totalIngredients, color: 'var(--accent-blue)' },
                      { label: 'Sales Entries', val: stats.totalSalesCount, color: 'var(--success)' },
                      { label: 'Recipes', val: stats.totalRecipes, color: 'var(--accent-gold)' },
                      { label: 'Guest Reviews', val: feedbacks.length || '—', color: 'var(--accent-brown)' },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                        <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-sans)' }}>{label}</p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '26px', fontWeight: 900, color, lineHeight: 1, fontFamily: 'var(--font-sans)' }}>{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Staff, RFID & Roster Management Quick Actions Hub */}
              <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} style={{ color: 'var(--accent-blue)' }} /> Staff, RFID & Roster Management Hub
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <a href="/admin/staff" style={{ display: 'flex', flexDirection: 'column', padding: '16px', background: '#F4F7FB', borderRadius: '12px', border: '1px solid #D0E1F9', textDecoration: 'none', color: '#1E293B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '14px', color: '#1565C0' }}>
                      👥 Staff Directory & ID Cards
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                      Add/edit staff, set Front/Kitchen roles, pair RFID cards, print official ID cards.
                    </p>
                  </a>

                  <a href="/attendance/roster" style={{ display: 'flex', flexDirection: 'column', padding: '16px', background: '#FEF8EC', borderRadius: '12px', border: '1px solid #F5D396', textDecoration: 'none', color: '#1E293B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '14px', color: '#B78103' }}>
                      📅 Weekly Duty Roster
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                      Build future rosters (+1, +2 weeks out), toggle Kitchen staff inclusion, AI auto-draft.
                    </p>
                  </a>

                  <a href="/admin/attendance-check" style={{ display: 'flex', flexDirection: 'column', padding: '16px', background: '#EDFDF5', borderRadius: '12px', border: '1px solid #A7F3D0', textDecoration: 'none', color: '#1E293B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '14px', color: '#047857' }}>
                      ⏱️ Live Attendance Check
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                      Real-time WebSocket monitoring (&lt;1s), minute-by-minute overtime beyond 10 hours.
                    </p>
                  </a>

                  <a href="/public-attendance" target="_blank" style={{ display: 'flex', flexDirection: 'column', padding: '16px', background: '#FAF5FF', borderRadius: '12px', border: '1px solid #E9D5FF', textDecoration: 'none', color: '#1E293B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '14px', color: '#6B21A8' }}>
                      📺 Public Display Kiosk (PWA)
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                      Read-only shop display, standalone PWA app mode, auto-start PC configuration guide.
                    </p>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ── DATABASE MANAGER ── */}
          {activeTab === 'db' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              <SectionHeader
                icon={<Database size={20} />}
                title="Database Manager"
                subtitle="Destructive operations — all actions are permanent and irreversible"
              />

              {/* Danger Banner */}
              <div style={{ background: 'linear-gradient(135deg, #1a0505 0%, #3b0909 100%)', borderRadius: '16px', padding: '24px 28px', border: '1px solid rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 4px 24px rgba(239,68,68,0.18)' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', inset: '-8px', borderRadius: '50%', background: 'rgba(239,68,68,0.25)', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
                  <div style={{ background: 'rgba(239,68,68,0.2)', padding: '12px', borderRadius: '50%', display: 'flex' }}>
                    <AlertTriangle size={24} color="#EF4444" />
                  </div>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#EF4444', fontFamily: 'var(--font-sans)', letterSpacing: '0.05em' }}>⚠ DANGER ZONE</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
                    The operations below are <strong style={{ color: 'rgba(255,255,255,0.85)' }}>permanently destructive</strong>. Cleared data cannot be recovered under any circumstances.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                <DbCard title="Clear Sales & Orders" desc="Delete all lifetime sales records. Does not affect menu or inventory structure." icon={Receipt} onClear={() => setShowConfirmModal('sales')} />
                <DbCard title="Clear Bazar / Expense" desc="Wipe all purchase history and expense logs from bazar entries." icon={ShoppingCart} onClear={() => setShowConfirmModal('bazar')} />
                <DbCard title="Clear Attendance & Payroll" desc="Remove all history for attendance, payroll, advance, and salary payments." icon={Users} onClear={() => setShowConfirmModal('attendance')} />
                <DbCard title="Full Factory Reset" desc="Wipe everything except staff list and menu structure. Complete clean slate. Irreversible." icon={Eraser} onClear={() => setShowConfirmModal('all')} danger />
              </div>
            </div>
          )}

          {/* ── MANAGEMENT ── */}
          {activeTab === 'entities' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              <SectionHeader
                icon={<Settings size={20} />}
                title="System Management"
                subtitle="Navigate system directories, configure options, and review telemetry"
              />

              {/* Staff Inbox Hero */}
              <div style={{ background: 'linear-gradient(135deg, #0f2a55 0%, #1d4ed8 50%, #2563eb 100%)', borderRadius: '18px', padding: '28px 32px', border: 'none', boxShadow: '0 8px 32px rgba(37,99,235,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-20px', bottom: '-30px', opacity: 0.06, pointerEvents: 'none' }}>
                  <AlertCircle size={180} color="white" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.15)', padding: '14px', borderRadius: '14px', backdropFilter: 'blur(10px)', display: 'flex' }}>
                    <AlertCircle size={26} color="white" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'white', fontFamily: 'var(--font-sans)' }}>Staff Inbox</h3>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: '4px 0 0 0', fontFamily: 'var(--font-sans)' }}>
                      View and reply to requisitions, leave requests, and staff messages
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/admin/queries')}
                  style={{ background: 'white', color: '#1d4ed8', padding: '12px 28px', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontFamily: 'var(--font-sans)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  Open Inbox →
                </button>
              </div>

              {/* App Launcher Grid */}
              <div>
                <p style={{ margin: '0 0 16px 0', fontSize: '11px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-sans)' }}>System Modules</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
                  {[
                    { label: 'Daily Sales Audit', desc: 'AI sales & cash shortage verification', icon: Receipt, color: 'var(--accent-blue)', bg: 'var(--accent-blue-dim)', border: 'var(--accent-blue)', action: () => setActiveTab('sales-audit') },
                    { label: 'Staff Directory', desc: 'Manage staff payroll & roles', icon: Users, color: 'var(--accent-blue)', bg: 'var(--accent-blue-dim)', border: 'var(--accent-blue)', action: () => router.push('/staff') },
                    { label: 'Manage Menu', desc: 'Update menu items & recipes', icon: Coffee, color: 'var(--accent-gold)', bg: 'var(--accent-gold-dim)', border: 'var(--accent-gold)', action: () => router.push('/menu') },
                    { label: 'Inventory Control', desc: 'Track raw stocks & movements', icon: Package, color: 'var(--success)', bg: 'var(--success-bg)', border: 'var(--success)', action: () => router.push('/stock') },
                    { label: 'Staff Portal', desc: 'Access portal dashboard view', icon: FileText, color: 'var(--accent-blue)', bg: 'var(--accent-blue-dim)', border: 'var(--accent-blue)', action: () => router.push('/portal') },
                    { label: 'Guest Feedbacks', desc: 'View customer reviews & ratings', icon: MessageSquare, color: 'var(--accent-brown)', bg: 'var(--accent-brown-dim)', border: 'var(--accent-brown)', action: () => setActiveTab('feedbacks') },
                  ].map(({ label, desc, icon: Icon, color, bg, border, action }) => (
                    <div
                      key={label}
                      className="mgmt-card"
                      style={{ '--hover-border': border }}
                      onClick={action}
                    >
                      <div style={{ background: bg, color, padding: '12px', borderRadius: '12px', width: 'fit-content', display: 'flex', transition: 'transform 0.2s' }}>
                        <Icon size={22} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{label}</h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', lineHeight: 1.4 }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── GUEST FEEDBACKS ── */}
          {activeTab === 'feedbacks' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <SectionHeader
                  icon={<MessageSquare size={20} style={{ color: 'var(--accent-brown)' }} />}
                  title="Guest Feedbacks"
                  subtitle="Customer reviews collected from ccadmin.online/guest-feedbacks"
                />
                <button
                  onClick={fetchFeedbacks}
                  disabled={feedbacksLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: feedbacksLoading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.2s' }}
                >
                  <RefreshCw size={13} style={{ animation: feedbacksLoading ? 'spin 0.8s linear infinite' : 'none' }} />
                  {feedbacksLoading ? 'Loading…' : 'Refresh'}
                </button>
              </div>

              {feedbacksLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '16px' }}>
                  <div style={{ width: '36px', height: '36px', border: '3px solid var(--accent-brown)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Loading reviews…</p>
                </div>
              ) : feedbacks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  <MessageSquare size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
                  <p style={{ fontSize: '15px', fontWeight: 600, margin: 0, fontFamily: 'var(--font-sans)' }}>No feedbacks received yet</p>
                  <p style={{ fontSize: '13px', margin: '6px 0 0 0', fontFamily: 'var(--font-sans)' }}>Reviews will appear here once guests submit feedback.</p>
                </div>
              ) : (() => {
                const avg = feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length
                const dist = [1, 2, 3, 4, 5].map(r => ({ r, count: feedbacks.filter(f => f.rating === r).length }))
                const maxDist = Math.max(...dist.map(d => d.count), 1)
                const hlCounts = ['food', 'service', 'value_for_money'].map(h => ({
                  label: h === 'value_for_money' ? 'Value for Money' : h.charAt(0).toUpperCase() + h.slice(1),
                  count: feedbacks.filter(f => f.highlights && f.highlights.includes(h)).length
                }))
                const maxHL = Math.max(...hlCounts.map(h => h.count), 1)
                return (
                  <>
                    {/* KPI Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                      {[
                        { label: 'Total Reviews', val: feedbacks.length, color: 'var(--accent-blue)', bg: 'var(--accent-blue-dim)' },
                        { label: 'Avg Rating', val: avg.toFixed(1) + ' ★', color: 'var(--accent-gold)', bg: 'var(--accent-gold-dim)' },
                        { label: 'Positive (4-5★)', val: Math.round(feedbacks.filter(f => f.rating >= 4).length / feedbacks.length * 100) + '%', color: 'var(--success)', bg: 'var(--success-bg)' },
                        { label: 'Critical (1-2★)', val: feedbacks.filter(f => f.rating <= 2).length, color: 'var(--danger)', bg: 'rgba(239,68,68,0.08)' },
                      ].map(({ label, val, color, bg }) => (
                        <div key={label} style={{ padding: '20px', background: bg, borderRadius: '14px', border: `1px solid ${color}33`, textAlign: 'center' }}>
                          <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-sans)' }}>{label}</p>
                          <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: 900, color, lineHeight: 1, fontFamily: 'var(--font-sans)' }}>{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Charts */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                      <div style={{ background: 'var(--bg-surface)', borderRadius: '14px', padding: '22px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}>
                        <h4 style={{ margin: '0 0 18px 0', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rating Distribution</h4>
                        <div style={{ display: 'grid', gap: '10px' }}>
                          {[5, 4, 3, 2, 1].map(r => {
                            const item = dist.find(d => d.r === r)
                            const pct = Math.round((item.count / maxDist) * 100)
                            const color = r >= 4 ? 'var(--success)' : r === 3 ? 'var(--warning)' : 'var(--danger)'
                            return (
                              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', width: '14px', textAlign: 'right', fontFamily: 'var(--font-sans)' }}>{r}</span>
                                <Star size={11} fill={color} stroke="none" />
                                <div style={{ flex: 1, height: '9px', background: 'var(--bg-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.7s ease' }} />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', minWidth: '18px', fontFamily: 'var(--font-sans)' }}>{item.count}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-surface)', borderRadius: '14px', padding: '22px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}>
                        <h4 style={{ margin: '0 0 18px 0', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>What Guests Loved</h4>
                        <div style={{ display: 'grid', gap: '14px' }}>
                          {hlCounts.map(({ label, count }) => {
                            const pct = Math.round((count / maxHL) * 100)
                            return (
                              <div key={label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>{label}</span>
                                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{count}</span>
                                </div>
                                <div style={{ height: '9px', background: 'var(--bg-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent-brown), var(--accent-brown-light))', borderRadius: '99px', transition: 'width 0.7s ease' }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Individual Reviews */}
                    <div>
                      <p style={{ margin: '0 0 14px 0', fontSize: '11px', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'var(--font-sans)' }}>
                        All Reviews ({feedbacks.length})
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                        {feedbacks.map((fb, idx) => {
                          const dt = new Date(fb.created_at)
                          const dateStr = dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                          const timeStr = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                          const accentColor = fb.rating === 5 ? 'var(--success)' : fb.rating >= 3 ? 'var(--warning)' : 'var(--danger)'
                          const isNewest = idx === 0
                          return (
                            <div key={fb.id} className="fb-card" style={{ '--fb-accent': accentColor }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={15} fill={s <= fb.rating ? 'var(--accent-gold)' : 'none'} stroke={s <= fb.rating ? 'var(--accent-gold)' : 'var(--text-faint)'} />
                                  ))}
                                  {isNewest && (
                                    <span style={{ marginLeft: '8px', fontSize: '9px', fontWeight: 800, color: 'var(--accent-brown)', background: 'var(--accent-brown-dim)', padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.08em', animation: 'badgePulse 2s infinite', fontFamily: 'var(--font-sans)' }}>
                                      NEW
                                    </span>
                                  )}
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{dateStr}</p>
                                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{timeStr}</p>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>📞 {fb.phone}</span>
                                {fb.highlights && fb.highlights.length > 0 && fb.highlights.map(h => (
                                  <span key={h} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '999px', background: 'var(--accent-brown-dim)', color: 'var(--accent-brown)', fontWeight: 600, textTransform: 'capitalize', fontFamily: 'var(--font-sans)' }}>
                                    {h.replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>

                              {fb.suggestion
                                ? <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: '8px', lineHeight: 1.55, fontFamily: 'var(--font-sans)' }}>{fb.suggestion}</p>
                                : <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-faint)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>No comment left.</p>
                              }
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

        </main>

        {/* ════════════════════════════════════════
            MOBILE BOTTOM NAV
        ════════════════════════════════════════ */}
        <nav className="admin-bottom-nav">
          {NAV_ITEMS.map(({ id, icon: Icon, label, badge, badgeColor }) => (
            <div
              key={id}
              className={`nav-item${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={18} strokeWidth={activeTab === id ? 2.2 : 1.8} />
              <span className="nav-label">{label}</span>
              {badge && (
                <span className="nav-badge" style={{ background: badgeColor }}>
                  {typeof badge === 'number' ? (badge > 99 ? '99+' : badge) : badge}
                </span>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* ════════════════════════════════════════
          CONFIRMATION MODAL
      ════════════════════════════════════════ */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            {/* Danger Icon with pulse ring */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div style={{ position: 'absolute', inset: '-12px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
                <div style={{ background: 'rgba(239,68,68,0.12)', borderRadius: '50%', padding: '18px', display: 'inline-flex', border: '2px solid rgba(239,68,68,0.3)' }}>
                  <AlertTriangle size={36} color="var(--danger)" />
                </div>
              </div>
              <h3 style={{ margin: '20px 0 8px 0', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                {showConfirmModal === 'all' ? 'Full System Wipe' : `Clear ${showConfirmModal}`}
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', lineHeight: 1.55 }}>
                You are about to permanently delete <strong style={{ color: 'var(--danger)' }}>{showConfirmModal === 'all' ? 'ALL SYSTEM DATA' : `the ${showConfirmModal} table`}</strong>. This action cannot be undone.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Type <code style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: '4px', color: 'var(--danger)', fontSize: '12px' }}>{showConfirmModal === 'all' ? 'WIPE ALL DATA' : 'CLEAR'}</code> to confirm
              </label>
              <input
                className={`input${shakeInput ? ' shake' : ''}`}
                placeholder="Type here to confirm…"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                autoFocus
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: `2px solid ${confirmText === (showConfirmModal === 'all' ? 'WIPE ALL DATA' : 'CLEAR') ? 'var(--success)' : 'var(--border-medium)'}`,
                  width: '100%',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setShowConfirmModal(null); setConfirmText('') }}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border-medium)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.2s' }}
              >
                Cancel
              </button>
              <button
                disabled={loading || confirmText !== (showConfirmModal === 'all' ? 'WIPE ALL DATA' : 'CLEAR')}
                onClick={() => showConfirmModal === 'all' ? wipeAllData() : clearTable(showConfirmModal)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: loading || confirmText !== (showConfirmModal === 'all' ? 'WIPE ALL DATA' : 'CLEAR') ? 'rgba(239,68,68,0.3)' : 'var(--danger)', color: 'white', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? <><div style={{ width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Wiping…</> : 'Confirm Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ─────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────── */

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', paddingBottom: '4px' }}>
      <div style={{ background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)', padding: '10px', borderRadius: '12px', display: 'flex', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{title}</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{subtitle}</p>
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color }}>
      <div className="kpi-ghost-icon"><Icon size={90} /></div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ background: `${color}18`, color, padding: '10px', borderRadius: '12px', display: 'flex' }}>
          <Icon size={20} />
        </div>
      </div>
      <p style={{ margin: 0, fontSize: '30px', fontWeight: 900, color, lineHeight: 1, fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}>{value}</p>
      <p style={{ margin: '8px 0 0 0', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-sans)' }}>{label}</p>
      <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--text-faint)', fontFamily: 'var(--font-sans)', fontStyle: 'italic' }}>{sub}</p>
    </div>
  )
}

function DbCard({ title, desc, icon: Icon, onClear, danger }) {
  return (
    <div className={`db-card${danger ? ' danger' : ''}`}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ background: danger ? 'rgba(239,68,68,0.1)' : 'var(--accent-blue-dim)', padding: '12px', borderRadius: '12px', color: danger ? 'var(--danger)' : 'var(--accent-blue)', flexShrink: 0 }}>
          <Icon size={22} />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: danger ? 'var(--danger)' : 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{title}</h4>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>{desc}</p>
        </div>
      </div>
      <button
        onClick={onClear}
        style={{ marginTop: 'auto', width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid var(--danger)', background: danger ? 'var(--danger)' : 'transparent', color: danger ? 'white' : 'var(--danger)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
        onMouseEnter={e => { if (!danger) e.currentTarget.style.background = 'rgba(239,68,68,0.06)' }}
        onMouseLeave={e => { if (!danger) e.currentTarget.style.background = 'transparent' }}
      >
        {danger ? <Eraser size={14} /> : <Trash2 size={14} />}
        {danger ? 'Factory Reset' : 'Clear Data'}
      </button>
    </div>
  )
}
