'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import {
  ShoppingCart, BookOpen, Package, ClipboardList,
  CheckCircle2, Wallet, TrendingUp, AlertTriangle, Calendar,
  Users, UserCheck, FileText, Send, MessageSquare, Clock,
  BellRing, Box, Zap, CalendarDays, ArrowUpRight, Activity,
  RefreshCw, Coffee, BarChart2, ArrowUp, ArrowDown, Calculator, ShieldAlert
} from 'lucide-react'

/* ─────────────────────────────────────────────────────────
   Live greeting
───────────────────────────────────────────────────────── */
function useGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function useLiveClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return t
}

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
import { useFeatureFlags } from '../hooks/useFeatureFlags'

export default function DashboardClient() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [stats, setStats] = useState({ totalSales: 0, totalBazar: 0, stockValue: 0, lowStockCount: 0 })
  const [hrStats, setHrStats] = useState({ activeStaff: 0, presentToday: 0, pendingAdvances: 0, payrollEstimate: 0 })
  const [alerts, setAlerts] = useState({ pendingLeaves: [], unreadMessages: [], lowStockItems: [] })
  const [broadcast, setBroadcast] = useState({ subject: '', message: '', sending: false, status: null })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const [hoveredChartIdx, setHoveredChartIdx] = useState(null)
  const { isEnabled } = useFeatureFlags()

  const greeting = useGreeting()
  const clock = useLiveClock()

  const adminName = typeof window !== 'undefined'
    ? (localStorage.getItem('cc_username') || 'Admin')
    : 'Admin'

  const fetchStatsForDate = useCallback(async (selectedDate) => {
    setLoading(true)
    try {
      const currentMonth = new Date(selectedDate).getMonth() + 1
      const currentYear = new Date(selectedDate).getFullYear()
      
      // Calculate 7-day date range ending on selected date
      const dateRange = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(selectedDate)
        d.setDate(d.getDate() - i)
        dateRange.push(d.toISOString().split('T')[0])
      }
      const startDate = dateRange[0]

      const [salesRes, bazarRes, ingRes, staffRes, attRes, advRes, leaveRes, msgRes, weekSalesRes, weekBazarRes] = await Promise.all([
        supabase.from('sales').select('total_revenue').eq('date', selectedDate),
        supabase.from('bazar_entries').select('total_cost').eq('date', selectedDate),
        supabase.from('ingredients').select('name, current_stock, cost_per_unit, min_stock'),
        supabase.from('staff').select('id, name, base_salary').eq('is_active', true),
        supabase.from('attendance').select('status').eq('date', selectedDate),
        supabase.from('advance_log').select('amount').eq('month', currentMonth).eq('year', currentYear),
        supabase.from('leave_requests').select('*, staff:staff_id(name)').eq('status', 'pending'),
        supabase.from('staff_queries').select('*, staff:staff_id(name)').eq('status', 'Pending'),
        supabase.from('sales').select('date, total_revenue').gte('date', startDate).lte('date', selectedDate),
        supabase.from('bazar_entries').select('date, total_cost').gte('date', startDate).lte('date', selectedDate),
      ])

      const totalSales = (salesRes.data || []).reduce((s, r) => s + (r.total_revenue || 0), 0)
      const totalBazar = (bazarRes.data || []).reduce((s, r) => s + (r.total_cost || 0), 0)
      const ingredients = ingRes.data || []
      const stockValue = ingredients.reduce((s, i) => s + ((i.current_stock || 0) * (i.cost_per_unit || 0)), 0)
      const lowStockItems = ingredients.filter(i => i.current_stock <= i.min_stock)
      setStats({ totalSales, totalBazar, stockValue, lowStockCount: lowStockItems.length })
      const activeStaff = staffRes.data?.length || 0
      const payrollEstimate = (staffRes.data || []).reduce((s, r) => s + (Number(r.base_salary) || 0), 0)
      const presentToday = (attRes.data || []).filter(a => a.status === 'present').length
      const pendingAdvances = (advRes.data || []).reduce((s, r) => s + (Number(r.amount) || 0), 0)
      setHrStats({ activeStaff, presentToday, payrollEstimate, pendingAdvances })
      setAlerts({ pendingLeaves: leaveRes.data || [], unreadMessages: msgRes.data || [], lowStockItems: lowStockItems.slice(0, 5) })

      // Aggregate chart data
      const chartData = dateRange.map(dStr => {
        const daySales = (weekSalesRes.data || []).filter(s => s.date === dStr).reduce((s, r) => s + (r.total_revenue || 0), 0)
        const dayBazar = (weekBazarRes.data || []).filter(b => b.date === dStr).reduce((s, r) => s + (r.total_cost || 0), 0)
        const label = new Date(dStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        return { date: dStr, label, sales: daySales, bazar: dayBazar }
      })
      setHistoryData(chartData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchStatsForDate(date)
    const channel = supabase.channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchStatsForDate(date))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bazar_entries' }, () => fetchStatsForDate(date))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => fetchStatsForDate(date))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => fetchStatsForDate(date))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_queries' }, () => fetchStatsForDate(date))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [date, fetchStatsForDate])

  const handleBroadcast = async (e) => {
    e.preventDefault()
    if (!broadcast.subject || !broadcast.message) return
    setBroadcast(prev => ({ ...prev, sending: true, status: null }))
    try {
      const { data: staff } = await supabase.from('staff').select('email, name').eq('is_active', true).not('email', 'is', null)
      if (!staff || staff.length === 0) throw new Error('No staff with emails')
      await Promise.all(staff.map(s => fetch('/api/email/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'broadcast', to: s.email, name: s.name, subject: broadcast.subject, message: broadcast.message })
      })))
      setBroadcast({ subject: '', message: '', sending: false, status: 'success' })
      setTimeout(() => setBroadcast(prev => ({ ...prev, status: null })), 3000)
    } catch {
      setBroadcast(prev => ({ ...prev, sending: false, status: 'error' }))
    }
  }

  const totalAlerts = alerts.pendingLeaves.length + alerts.unreadMessages.length + stats.lowStockCount
  const profit = stats.totalSales - stats.totalBazar
  const attendancePct = hrStats.activeStaff > 0 ? Math.round((hrStats.presentToday / hrStats.activeStaff) * 100) : 0

  const allQuickModules = [
    { href: '/recipebook',          icon: <BookOpen size={22} />,      title: 'Recipe Book',     color: '#6B3A2A', desc: 'Online recipes & PDF', flag: 'recipebook' },
    { href: '/sales-reconciliation', icon: <ShieldAlert size={22} />, title: 'Daily Sales Audit', color: '#E11D48', desc: 'AI sales & cash audit', flag: 'sales_audit' },
    { href: '/admin?tab=feedbacks', icon: <MessageSquare size={22} />, title: 'Guest Feedbacks', color: '#B0633E', desc: 'Reviews & ratings',     flag: 'feedbacks' },
    { href: '/menu',               icon: <BookOpen size={22} />,      title: 'Menu',            color: '#3B82F6', desc: 'Manage items',       flag: 'menu_list' },
    { href: '/admin/menu-engineering', icon: <BarChart2 size={22} />, title: 'Menu Engineering', color: '#7C3A1E', desc: 'Costing & Profitability', flag: 'menu_engineering' },
    { href: '/bazar',              icon: <ClipboardList size={22} />, title: 'Bazar',           color: '#EF4444', desc: 'Log expenses',       flag: 'bazar' },
    { href: '/stock',              icon: <Box size={22} />,            title: 'Inventory',       color: '#F59E0B', desc: 'Track stock',      flag: 'inventory_manager', badge: stats.lowStockCount > 0 ? stats.lowStockCount : null },
    { href: '/stock-audit',        icon: <Calculator size={22} />,    title: 'Stock Audit',     color: '#10B981', desc: 'Monthly bazar ratio', flag: 'stock_audit' },
    { href: '/staff/attendance',   icon: <UserCheck size={22} />,     title: 'Attendance',      color: '#8B5CF6', desc: 'Mark attendance',    flag: 'attendance_live' },
    { href: '/staff/payroll',      icon: <FileText size={22} />,      title: 'Payroll',         color: '#2563EB', desc: 'Process salaries',   flag: 'payroll' },
    { href: '/staff/leave-requests', icon: <CalendarDays size={22} />, title: 'Leave',          color: '#D97706', desc: 'Review leaves',    flag: 'leave_requests', badge: alerts.pendingLeaves.length > 0 ? alerts.pendingLeaves.length : null },
    { href: '/admin/queries',      icon: <MessageSquare size={22} />, title: 'Staff Inbox',     color: '#0EA5E9', desc: 'Manage queries',   badge: alerts.unreadMessages.length > 0 ? alerts.unreadMessages.length : null },
  ]

  const quickModules = allQuickModules.filter(mod => !mod.flag || isEnabled(mod.flag))

  const dateLabel = new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-ring { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        @keyframes check-pop { 0%{transform:scale(0)} 70%{transform:scale(1.15)} 100%{transform:scale(1)} }

        .dash-root { max-width: 1520px; margin: 0 auto; padding: 32px 28px 80px; font-family: var(--font-sans); animation: fadeUp 0.4s ease; }
        .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 28px; }
        .dash-grid { display: grid; grid-template-columns: 1.7fr 1.3fr; gap: 20px; align-items: start; }
        .module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }

        .kpi-card { background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 16px; padding: 20px 22px; box-shadow: var(--shadow-sm); position: relative; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; cursor: default; }
        .kpi-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
        .kpi-card::after { content:''; position:absolute; bottom:0; left:0; right:0; height:3px; background: linear-gradient(90deg, var(--kpi-color) 0%, var(--kpi-color)44 100%); }
        .kpi-ghost { position:absolute; right:-8px; bottom:-6px; opacity:0.05; pointer-events:none; }

        .mod-card { padding:16px 12px; border-radius:14px; border:1.5px solid var(--border-light); background:var(--bg-subtle); display:flex; flex-direction:column; align-items:center; gap:10px; transition:all 0.22s ease; position:relative; cursor:pointer; min-height:108px; justify-content:center; text-decoration:none; }
        .mod-card:hover { transform:translateY(-4px); }

        .panel { background:var(--bg-surface); border:1px solid var(--border-light); border-radius:18px; box-shadow:var(--shadow-sm); overflow:hidden; }
        .panel-header { padding:18px 22px; border-bottom:1px solid var(--border-light); display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .panel-body { padding:20px 22px; }

        .alert-row { padding:15px 20px; border-bottom:1px solid var(--border-light); display:flex; gap:14px; align-items:flex-start; transition:background 0.15s; }
        .alert-row:hover { background:var(--bg-subtle); }
        .alert-row:last-child { border-bottom:none; }

        .date-chip { display:flex; align-items:center; gap:10px; background:var(--bg-surface); padding:9px 16px; border-radius:12px; border:1.5px solid var(--border-light); box-shadow:var(--shadow-xs); }
        .refresh-btn { width:38px; height:38px; border-radius:10px; border:1.5px solid var(--border-light); background:var(--bg-surface); display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--text-muted); transition:all 0.2s; }
        .refresh-btn:hover { background:var(--accent-blue-dim); color:var(--accent-blue); border-color:var(--border-accent); }

        @media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 900px) {
          .dash-grid { grid-template-columns: 1fr !important; }
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .dash-root { padding: 20px 16px 100px; }
        }
        @media (max-width: 480px) { .kpi-grid { grid-template-columns: 1fr; } }
        @media (min-width: 1920px) { .dash-root { padding: 40px 48px 80px; } }
      `}</style>

      <div className="dash-root">

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #7C3A1E, #D4933A)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(124,58,30,0.3)', flexShrink: 0 }}>
                <Coffee size={20} color="white" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{greeting}, <strong style={{ color: 'var(--text-primary)' }}>{adminName}</strong> 👋</p>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>Command Center</h1>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{dateLabel}</span>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-faint)', display: 'inline-block' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.04em' }}>{clock}</span>
              <span style={{ padding: '2px 8px', borderRadius: '999px', background: 'var(--success-bg)', color: 'var(--success)', fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em' }}>● LIVE</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div className="date-chip">
              <Calendar size={15} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 1px' }}>Date Filter</p>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                />
              </div>
            </div>
            <button
              className="refresh-btn"
              onClick={() => { setRefreshing(true); fetchStatsForDate(date) }}
            >
              <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* ── KPI ROW ── */}
        <div className="kpi-grid">
          <KpiCard
            title="Daily Sales"
            value={stats.totalSales}
            icon={<TrendingUp size={20} />}
            color="#10B981"
            subtitle={dateLabel.split(',')[0]}
            loading={loading}
            trend="up"
          />
          <KpiCard
            title="Daily Expenses"
            value={stats.totalBazar}
            icon={<Wallet size={20} />}
            color="#EF4444"
            subtitle={dateLabel.split(',')[0]}
            loading={loading}
            trend="down"
          />
          <KpiCard
            title="Net Profit"
            value={profit}
            icon={<Activity size={20} />}
            color={profit >= 0 ? '#3B82F6' : '#F59E0B'}
            subtitle="Sales minus expenses"
            loading={loading}
          />
          <KpiCard
            title="Stock Value"
            value={stats.stockValue}
            icon={<Package size={20} />}
            color="#8B5CF6"
            subtitle="Current estimated value"
            loading={loading}
          />
          <KpiCard
            title="Payroll Est."
            value={hrStats.payrollEstimate}
            icon={<Users size={20} />}
            color="#F59E0B"
            subtitle="Monthly base salaries"
            loading={loading}
          />
        </div>

        {/* ── FEATURED AI SALES & CASH AUDIT BANNER IN COMMAND CENTER ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '28px',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(15,23,42,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'rgba(59,130,246,0.2)', padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <ShieldAlert size={26} color="#60A5FA" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'white', fontFamily: 'var(--font-sans)' }}>
                AI Daily Sales & Cash Audit Engine
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)' }}>
                Upload POS report, staff closing sheet, delivery app earnings & bazaar receipts for zero-tolerance cash shortage detection.
              </p>
            </div>
          </div>
          <Link
            href="/sales-reconciliation"
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: '13px',
              boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'var(--font-sans)'
            }}
          >
            Open Audit Engine →
          </Link>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="dash-grid">

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Weekly SVG Line Chart */}
            {historyData.length > 0 && (
              <div className="panel" style={{ overflow: 'visible' }}>
                <div className="panel-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'var(--accent-blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BarChart2 size={15} style={{ color: 'var(--accent-blue)' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>Weekly Financial Trends</h2>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Sales vs. Bazar Expenses comparison (last 7 days)</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: 700 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981' }}>● Sales</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EF4444' }}>● Expenses</span>
                  </div>
                </div>
                <div className="panel-body" style={{ padding: '20px 22px 14px', position: 'relative' }}>
                  {(() => {
                    const maxVal = Math.max(...historyData.map(d => Math.max(d.sales, d.bazar)), 1000)
                    const paddingX = 40
                    const paddingY = 20
                    const chartW = 600
                    const chartH = 180
                    const stepX = (chartW - paddingX * 2) / (historyData.length - 1)
                    
                    const pointsSales = historyData.map((d, i) => ({
                      x: paddingX + i * stepX,
                      y: chartH - paddingY - (d.sales / maxVal) * (chartH - paddingY * 2)
                    }))
                    
                    const pointsBazar = historyData.map((d, i) => ({
                      x: paddingX + i * stepX,
                      y: chartH - paddingY - (d.bazar / maxVal) * (chartH - paddingY * 2)
                    }))

                    const salesPath = pointsSales.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                    const salesArea = salesPath + ` L ${pointsSales[pointsSales.length-1].x} ${chartH - paddingY} L ${pointsSales[0].x} ${chartH - paddingY} Z`
                    
                    const bazarPath = pointsBazar.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                    const bazarArea = bazarPath + ` L ${pointsBazar[pointsBazar.length-1].x} ${chartH - paddingY} L ${pointsBazar[0].x} ${chartH - paddingY} Z`

                    return (
                      <div style={{ position: 'relative' }}>
                        <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                          <defs>
                            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="bazarGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                            const y = chartH - paddingY - ratio * (chartH - paddingY * 2)
                            return (
                              <g key={idx}>
                                <line x1={paddingX} y1={y} x2={chartW - paddingX} y2={y} stroke="var(--border-light)" strokeDasharray="4 4" strokeWidth="1" />
                                <text x={paddingX - 8} y={y + 4} textAnchor="end" fontSize="9" fill="var(--text-faint)" fontWeight="600">
                                  ৳{Math.round((ratio * maxVal) / 100) * 100}
                                </text>
                              </g>
                            )
                          })}

                          {/* Colored Areas */}
                          <path d={salesArea} fill="url(#salesGrad)" />
                          <path d={bazarArea} fill="url(#bazarGrad)" />

                          {/* Highlight Columns for hover */}
                          {historyData.map((d, i) => {
                            const x = paddingX + i * stepX
                            return (
                              <rect
                                key={i}
                                x={x - stepX / 2}
                                y={paddingY}
                                width={stepX}
                                height={chartH - paddingY * 2}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredChartIdx(i)}
                                onMouseLeave={() => setHoveredChartIdx(null)}
                              />
                            )
                          })}

                          {/* Sales Line */}
                          <path d={salesPath} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          {/* Bazar Line */}
                          <path d={bazarPath} fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                          {/* Vertices & Vertical cursor line on hover */}
                          {hoveredChartIdx !== null && (
                            <line
                              x1={paddingX + hoveredChartIdx * stepX}
                              y1={paddingY}
                              x2={paddingX + hoveredChartIdx * stepX}
                              y2={chartH - paddingY}
                              stroke="var(--border-medium)"
                              strokeWidth="1.5"
                              strokeDasharray="2 2"
                            />
                          )}

                          {pointsSales.map((p, i) => (
                            <circle
                              key={i}
                              cx={p.x}
                              cy={p.y}
                              r={hoveredChartIdx === i ? 6 : 4}
                              fill="#10B981"
                              stroke="var(--bg-surface)"
                              strokeWidth="2"
                              style={{ transition: 'r 0.15s' }}
                            />
                          ))}

                          {pointsBazar.map((p, i) => (
                            <circle
                              key={i}
                              cx={p.x}
                              cy={p.y}
                              r={hoveredChartIdx === i ? 6 : 4}
                              fill="#EF4444"
                              stroke="var(--bg-surface)"
                              strokeWidth="2"
                              style={{ transition: 'r 0.15s' }}
                            />
                          ))}

                          {/* X Labels */}
                          {historyData.map((d, i) => (
                            <text
                              key={i}
                              x={paddingX + i * stepX}
                              y={chartH - paddingY + 14}
                              textAnchor="middle"
                              fontSize="9.5"
                              fontWeight="700"
                              fill="var(--text-muted)"
                            >
                              {d.label}
                            </text>
                          ))}
                        </svg>

                        {/* Interactive Tooltip Element */}
                        {hoveredChartIdx !== null && (
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: `${(paddingX + hoveredChartIdx * stepX) / 6}%`,
                            transform: 'translateX(-50%)',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-medium)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            boxShadow: 'var(--shadow-md)',
                            pointerEvents: 'none',
                            zIndex: 10,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            minWidth: '120px'
                          }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                              {historyData[hoveredChartIdx].label}
                            </span>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
                              <span>Sales:</span>
                              <span>৳{historyData[hoveredChartIdx].sales.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>
                              <span>Bazar:</span>
                              <span>৳{historyData[hoveredChartIdx].bazar.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* Quick Modules */}
            <div className="panel">
              <div className="panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={15} style={{ color: 'var(--warning)' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>Quick Modules</h2>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Navigate to any section instantly</p>
                  </div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: '999px', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {quickModules.length} modules
                </span>
              </div>
              <div className="panel-body">
                <div className="module-grid">
                  {quickModules.map((m, i) => (
                    <ModuleCard key={i} {...m} />
                  ))}
                </div>
              </div>
            </div>

            {/* Broadcast */}
            <div className="panel">
              <div style={{ background: 'linear-gradient(135deg, #0f2a55 0%, #1d4ed8 60%, #2563eb 100%)', padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-16px', bottom: '-20px', opacity: 0.07, pointerEvents: 'none' }}>
                  <Send size={120} color="white" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                  <div style={{ background: 'rgba(255,255,255,0.15)', padding: '9px', borderRadius: '10px', display: 'flex' }}>
                    <Send size={18} color="white" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'white', margin: 0 }}>Broadcast to All Staff</h2>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>Instantly email all active members</p>
                  </div>
                </div>
              </div>
              <div className="panel-body">
                <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="Email subject…"
                    className="input"
                    required
                    value={broadcast.subject}
                    onChange={e => setBroadcast({ ...broadcast, subject: e.target.value })}
                    style={{ fontSize: '14px', padding: '11px 14px', borderRadius: '10px' }}
                  />
                  <textarea
                    placeholder="Type your message here…"
                    className="input"
                    required
                    rows={3}
                    value={broadcast.message}
                    onChange={e => setBroadcast({ ...broadcast, message: e.target.value })}
                    style={{ resize: 'vertical', minHeight: '80px', fontSize: '14px', padding: '11px 14px', borderRadius: '10px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
                      color: broadcast.status === 'success' ? 'var(--success)' : broadcast.status === 'error' ? 'var(--danger)' : 'transparent'
                    }}>
                      {broadcast.status === 'success' ? '✅ Sent successfully!' : broadcast.status === 'error' ? '❌ Failed to send' : '.'}
                    </span>
                    <button
                      type="submit"
                      disabled={broadcast.sending || !broadcast.subject || !broadcast.message}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 22px',
                        borderRadius: '10px', border: 'none', fontFamily: 'var(--font-sans)',
                        background: 'var(--accent-blue)', color: 'white',
                        fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                        opacity: (broadcast.sending || !broadcast.subject || !broadcast.message) ? 0.55 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      {broadcast.sending
                        ? <><div style={{ width: '13px', height: '13px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Sending…</>
                        : <><Send size={13} /> Send to All</>
                      }
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Action Center */}
            <div className="panel" style={{ border: `1.5px solid ${totalAlerts > 0 ? 'rgba(239,68,68,0.30)' : 'var(--border-light)'}` }}>
              <div className="panel-header" style={{ background: totalAlerts > 0 ? 'rgba(239,68,68,0.05)' : 'var(--bg-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <div style={{ position: 'relative' }}>
                    {totalAlerts > 0 && (
                      <div style={{ position: 'absolute', inset: '-4px', borderRadius: '50%', background: 'rgba(239,68,68,0.2)', animation: 'pulse-ring 1.5s ease-in-out infinite' }} />
                    )}
                    <BellRing size={18} style={{ color: totalAlerts > 0 ? 'var(--danger)' : 'var(--text-muted)', position: 'relative' }} />
                  </div>
                  <h2 style={{ fontSize: '15px', fontWeight: 800, color: totalAlerts > 0 ? 'var(--danger)' : 'var(--text-primary)', margin: 0 }}>
                    Action Center
                  </h2>
                </div>
                {totalAlerts > 0 && (
                  <span style={{ background: 'var(--danger)', color: 'white', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, boxShadow: '0 2px 8px rgba(239,68,68,0.35)' }}>
                    {totalAlerts} Pending
                  </span>
                )}
              </div>

              <div>
                {alerts.pendingLeaves.map(lv => (
                  <div key={lv.id} className="alert-row">
                    <div style={{ background: '#F59E0B18', color: '#F59E0B', padding: '8px', borderRadius: '9px', flexShrink: 0, borderLeft: '3px solid #F59E0B' }}>
                      <Clock size={16} />
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Pending Leave</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <strong>{lv.staff?.name}</strong> — {lv.leave_type} leave
                        ({new Date(lv.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        {lv.start_date !== lv.end_date && ` → ${new Date(lv.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`})
                      </p>
                      <Link href="/staff/leave-requests" style={{ fontSize: '11.5px', color: '#F59E0B', fontWeight: 700, marginTop: '5px', display: 'inline-block' }}>Review →</Link>
                    </div>
                  </div>
                ))}

                {alerts.unreadMessages.map(msg => (
                  <div key={msg.id} className="alert-row">
                    <div style={{ background: '#3B82F618', color: '#3B82F6', padding: '8px', borderRadius: '9px', flexShrink: 0, borderLeft: '3px solid #3B82F6' }}>
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Staff Request
                        <span style={{ marginLeft: '6px', fontSize: '10px', background: '#3B82F618', color: '#3B82F6', padding: '2px 7px', borderRadius: '999px', fontWeight: 700 }}>{msg.type}</span>
                      </h4>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        <strong>{msg.staff?.name || msg.staff_name}</strong> — "{msg.message.substring(0, 60)}{msg.message.length > 60 ? '…' : ''}"
                      </p>
                      <Link href="/admin/queries" style={{ fontSize: '11.5px', color: '#3B82F6', fontWeight: 700, marginTop: '5px', display: 'inline-block' }}>Open Inbox →</Link>
                    </div>
                  </div>
                ))}

                {alerts.lowStockItems.length > 0 && (
                  <div className="alert-row">
                    <div style={{ background: '#EF444418', color: '#EF4444', padding: '8px', borderRadius: '9px', flexShrink: 0, borderLeft: '3px solid #EF4444' }}>
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Low Stock — {stats.lowStockCount} items</h4>
                      <ul style={{ margin: '4px 0 0', paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        {alerts.lowStockItems.map((item, i) => (
                          <li key={i}><strong>{item.name}</strong> ({item.current_stock} left)</li>
                        ))}
                      </ul>
                      <Link href="/stock" style={{ fontSize: '11.5px', color: '#EF4444', fontWeight: 700, marginTop: '5px', display: 'inline-block' }}>Manage Stock →</Link>
                    </div>
                  </div>
                )}

                {totalAlerts === 0 && !loading && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ background: 'var(--success-bg)', borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', animation: 'check-pop 0.4s ease' }}>
                      <CheckCircle2 size={28} style={{ color: 'var(--success)' }} />
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>All Clear!</p>
                    <p style={{ fontSize: '12px', margin: 0 }}>No pending actions right now.</p>
                  </div>
                )}

                {loading && (
                  <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '24px', height: '24px', border: '2.5px solid var(--border-medium)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Snapshot */}
            <div className="panel">
              <div className="panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'var(--accent-blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={15} style={{ color: 'var(--accent-blue)' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Today's Attendance</h2>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>{dateLabel.split(',')[0]}</p>
                  </div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: '999px', background: attendancePct >= 80 ? 'var(--success-bg)' : 'var(--warning-bg)', color: attendancePct >= 80 ? 'var(--success)' : 'var(--warning)', fontSize: '12px', fontWeight: 800 }}>
                  {attendancePct}%
                </span>
              </div>
              <div className="panel-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '20px' }}>
                  {/* SVG Ring */}
                  <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                    <svg viewBox="0 0 100 100" style={{ width: '100px', height: '100px', transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-subtle)" strokeWidth="10" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke={attendancePct >= 80 ? 'var(--accent-blue)' : attendancePct >= 50 ? 'var(--warning)' : 'var(--danger)'}
                        strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - attendancePct / 100)}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{attendancePct}%</span>
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '36px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.04em', lineHeight: 1 }}>
                      {hrStats.presentToday}
                      <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 600 }}>/{hrStats.activeStaff}</span>
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 16px' }}>Present today</p>
                    {/* Mini stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ padding: '10px', background: 'var(--success-bg)', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--success)', lineHeight: 1 }}>{hrStats.presentToday}</p>
                        <p style={{ margin: '3px 0 0', fontSize: '10px', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Present</p>
                      </div>
                      <div style={{ padding: '10px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: 'var(--danger)', lineHeight: 1 }}>{hrStats.activeStaff - hrStats.presentToday}</p>
                        <p style={{ margin: '3px 0 0', fontSize: '10px', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Absent</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Link
                  href="/staff/attendance"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px', borderRadius: '10px', border: '1.5px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '13px', textDecoration: 'none', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; e.currentTarget.style.background = 'var(--accent-blue-dim)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-subtle)' }}
                >
                  <UserCheck size={14} /> View Live Attendance <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>

            {/* HR Mini Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Active Staff', val: hrStats.activeStaff, icon: <Users size={16} />, color: '#3B82F6' },
                { label: 'Monthly Advances', val: `৳${hrStats.pendingAdvances.toLocaleString()}`, icon: <Wallet size={16} />, color: '#F59E0B' },
              ].map(({ label, val, icon, color }) => (
                <div key={label} style={{ background: 'var(--bg-surface)', borderRadius: '14px', padding: '18px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}>
                  <div style={{ background: color + '18', color, padding: '8px', borderRadius: '8px', width: 'fit-content', marginBottom: '12px' }}>
                    {icon}
                  </div>
                  <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{val}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────
   KPI Card
───────────────────────────────────────────────────────── */
function KpiCard({ title, value, icon, color, subtitle, loading, trend }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color }}>
      <div className="kpi-ghost">{icon && <span style={{ fontSize: '80px', color }}>{icon}</span>}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ background: color + '18', color, padding: '9px', borderRadius: '10px' }}>{icon}</div>
        {trend && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color: trend === 'up' ? '#10B981' : '#EF4444', background: trend === 'up' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '3px 8px', borderRadius: '999px' }}>
            {trend === 'up' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {trend === 'up' ? 'Revenue' : 'Expense'}
          </span>
        )}
      </div>
      {loading ? (
        <div style={{ height: '32px', background: 'var(--bg-subtle)', borderRadius: '6px', marginBottom: '8px', animation: 'pulse-ring 1.5s ease-in-out infinite' }} />
      ) : (
        <p style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
          ৳{value.toLocaleString()}
        </p>
      )}
      <p style={{ margin: '8px 0 0', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</p>
      <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--text-faint)' }}>{subtitle}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   Module Card
───────────────────────────────────────────────────────── */
function ModuleCard({ href, icon, title, color, desc, badge }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        className="mod-card"
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = color
          e.currentTarget.style.boxShadow = `0 8px 24px ${color}25`
          e.currentTarget.style.background = color + '0D'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border-light)'
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.background = 'var(--bg-subtle)'
        }}
      >
        {badge && (
          <div style={{ position: 'absolute', top: '-7px', right: '-7px', background: '#EF4444', color: 'white', fontSize: '10px', fontWeight: 800, padding: '3px 7px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
            {badge}
          </div>
        )}
        <div style={{ background: color + '18', color, padding: '10px', borderRadius: '11px' }}>{icon}</div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{title}</span>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{desc}</span>
        </div>
      </div>
    </Link>
  )
}
