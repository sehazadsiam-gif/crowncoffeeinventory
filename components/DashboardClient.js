'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import {
  ShoppingCart, BookOpen, Package, ClipboardList,
  CheckCircle2, Wallet, TrendingUp, AlertTriangle, Calendar,
  Users, UserCheck, FileText, Send, MessageSquare, Clock,
  BellRing, Box, Zap, CalendarDays, ArrowUpRight, Activity,
  RefreshCw, Sparkles, Coffee
} from 'lucide-react'

export default function DashboardClient() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [stats, setStats] = useState({ totalSales: 0, totalBazar: 0, stockValue: 0, lowStockCount: 0 })
  const [hrStats, setHrStats] = useState({ activeStaff: 0, presentToday: 0, pendingAdvances: 0, payrollEstimate: 0 })
  const [alerts, setAlerts] = useState({ pendingLeaves: [], unreadMessages: [], lowStockItems: [] })
  const [broadcast, setBroadcast] = useState({ subject: '', message: '', sending: false, status: null })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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
  }, [date])

  async function fetchStatsForDate(selectedDate) {
    setLoading(true)
    try {
      const currentMonth = new Date(selectedDate).getMonth() + 1
      const currentYear = new Date(selectedDate).getFullYear()
      const [salesRes, bazarRes, ingRes, staffRes, attRes, advRes, leaveRes, msgRes] = await Promise.all([
        supabase.from('sales').select('total_revenue').eq('date', selectedDate),
        supabase.from('bazar_entries').select('total_cost').eq('date', selectedDate),
        supabase.from('ingredients').select('name, current_stock, cost_per_unit, min_stock'),
        supabase.from('staff').select('id, name, base_salary').eq('is_active', true),
        supabase.from('attendance').select('status').eq('date', selectedDate),
        supabase.from('advance_log').select('amount').eq('month', currentMonth).eq('year', currentYear),
        supabase.from('leave_requests').select('*, staff:staff_id(name)').eq('status', 'pending'),
        supabase.from('staff_queries').select('*, staff:staff_id(name)').eq('status', 'Pending'),
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
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

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
    } catch (error) {
      setBroadcast(prev => ({ ...prev, sending: false, status: 'error' }))
    }
  }

  const totalAlerts = alerts.pendingLeaves.length + alerts.unreadMessages.length + stats.lowStockCount
  const profit = stats.totalSales - stats.totalBazar
  const attendancePct = hrStats.activeStaff > 0 ? Math.round((hrStats.presentToday / hrStats.activeStaff) * 100) : 0

  const quickModules = [
    { href: '/sales',              icon: <ShoppingCart size={22} />, title: 'Sales POS',       color: '#10B981', desc: 'Record daily sales' },
    { href: '/menu',               icon: <BookOpen size={22} />,     title: 'Menu',             color: '#3B82F6', desc: 'Manage menu items' },
    { href: '/bazar',              icon: <ClipboardList size={22} />,title: 'Bazar',            color: '#EF4444', desc: 'Log expenses' },
    { href: '/stock',              icon: <Box size={22} />,           title: 'Inventory',        color: '#F59E0B', desc: 'Track stock', badge: stats.lowStockCount > 0 ? stats.lowStockCount : null },
    { href: '/staff/attendance',   icon: <UserCheck size={22} />,    title: 'Attendance',       color: '#8B5CF6', desc: 'Mark attendance' },
    { href: '/staff/payroll',      icon: <FileText size={22} />,     title: 'Payroll',          color: '#2563EB', desc: 'Process salaries' },
    { href: '/staff/leave-requests',icon:<CalendarDays size={22} />, title: 'Leave Requests',  color: '#D97706', desc: 'Review leaves', badge: alerts.pendingLeaves.length > 0 ? alerts.pendingLeaves.length : null },
    { href: '/admin/queries',      icon: <MessageSquare size={22} />,title: 'Staff Inbox',      color: '#0EA5E9', desc: 'Manage queries', badge: alerts.unreadMessages.length > 0 ? alerts.unreadMessages.length : null },
  ]

  return (
    <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 20px 80px', fontFamily: 'var(--font-sans)' }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #7C3A1E, #D4933A)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,58,30,0.28)' }}>
              <Coffee size={18} color="white" />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>Command Center</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Real-time overview of your cafe operations</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-surface)', padding: '10px 16px', borderRadius: '12px', border: '1.5px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}>
            <Calendar size={16} style={{ color: 'var(--accent-blue)' }} />
            <div>
              <p style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Date Filter</p>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              />
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={() => { setRefreshing(true); fetchStatsForDate(date) }}
            style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1.5px solid var(--border-light)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--accent-blue)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <RefreshCw size={16} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <PremiumStat title="Daily Sales" value={stats.totalSales} icon={<TrendingUp size={20} />} accentColor="#10B981" subtitle={`${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`} loading={loading} trend="up" />
        <PremiumStat title="Daily Expenses" value={stats.totalBazar} icon={<Wallet size={20} />} accentColor="#EF4444" subtitle={`${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`} loading={loading} trend="down" />
        <PremiumStat title="Net Profit" value={profit} icon={<Activity size={20} />} accentColor={profit >= 0 ? '#3B82F6' : '#F59E0B'} subtitle="Sales minus expenses" loading={loading} />
        <PremiumStat title="Stock Value" value={stats.stockValue} icon={<Package size={20} />} accentColor="#8B5CF6" subtitle="Current estimated value" loading={loading} />
        <PremiumStat title="Payroll Est." value={hrStats.payrollEstimate} icon={<Users size={20} />} accentColor="#F59E0B" subtitle="Monthly base salary total" loading={loading} />
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1.3fr)', gap: '20px', alignItems: 'start' }} className="dash-grid">

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Quick Modules */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '18px', padding: '22px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={15} style={{ color: 'var(--warning)' }} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>Quick Modules</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
              {quickModules.map((m, i) => (
                <ModuleCard key={i} {...m} />
              ))}
            </div>
          </div>

          {/* Broadcast */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="rgba(255,255,255,0.85)" />
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'white', margin: 0 }}>Broadcast to All Staff</h2>
              </div>
              <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.60)', margin: '4px 0 0' }}>Instantly email all active staff members.</p>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text" placeholder="Email subject..." className="input" required
                  value={broadcast.subject} onChange={e => setBroadcast({ ...broadcast, subject: e.target.value })}
                />
                <textarea
                  placeholder="Type your message here..." className="input" required rows={3}
                  value={broadcast.message} onChange={e => setBroadcast({ ...broadcast, message: e.target.value })}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{
                    fontSize: '13px', fontWeight: 600,
                    color: broadcast.status === 'success' ? 'var(--success)' : broadcast.status === 'error' ? 'var(--danger)' : 'transparent',
                    transition: 'all 0.2s'
                  }}>
                    {broadcast.status === 'success' ? '✅ Sent successfully!' : broadcast.status === 'error' ? '❌ Failed to send' : '.'}
                  </span>
                  <button
                    type="submit"
                    disabled={broadcast.sending || !broadcast.subject || !broadcast.message}
                    className="btn-primary"
                    style={{ padding: '9px 20px', fontSize: '13.5px', opacity: (broadcast.sending || !broadcast.subject || !broadcast.message) ? 0.55 : 1 }}
                  >
                    {broadcast.sending ? 'Sending...' : <><Send size={14} /> Send to All</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Action Center */}
          <div style={{ background: 'var(--bg-surface)', border: `1.5px solid ${totalAlerts > 0 ? 'rgba(239,68,68,0.30)' : 'var(--border-light)'}`, borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{
              padding: '16px 20px',
              background: totalAlerts > 0 ? 'rgba(239,68,68,0.07)' : 'var(--bg-subtle)',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: totalAlerts > 0 ? 'var(--danger)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <BellRing size={16} /> Action Center
              </h2>
              {totalAlerts > 0 && (
                <span style={{ background: 'var(--danger)', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                  {totalAlerts} Pending
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {alerts.pendingLeaves.map(lv => (
                <AlertRow key={lv.id} icon={<Clock size={16} />} color="#F59E0B" title="Pending Leave">
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{lv.staff?.name}</span> — {lv.leave_type} leave
                  ({new Date(lv.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {lv.start_date !== lv.end_date && ` → ${new Date(lv.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`})
                  <div style={{ marginTop: '6px' }}>
                    <Link href="/staff/leave-requests" style={{ fontSize: '11.5px', color: '#F59E0B', fontWeight: 700 }}>Review →</Link>
                  </div>
                </AlertRow>
              ))}

              {alerts.unreadMessages.map(msg => (
                <AlertRow key={msg.id} icon={<MessageSquare size={16} />} color="#3B82F6" title="Staff Request">
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{msg.staff?.name || msg.staff_name}</span>
                  {' '}<span className="badge badge-blue" style={{ fontSize: '10px', verticalAlign: 'middle' }}>{msg.type}</span>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>"{msg.message.substring(0, 65)}{msg.message.length > 65 ? '…' : ''}"</p>
                  <div style={{ marginTop: '6px' }}>
                    <Link href="/admin/queries" style={{ fontSize: '11.5px', color: '#3B82F6', fontWeight: 700 }}>Open Inbox →</Link>
                  </div>
                </AlertRow>
              ))}

              {alerts.lowStockItems.length > 0 && (
                <AlertRow icon={<AlertTriangle size={16} />} color="#EF4444" title={`Low Stock — ${stats.lowStockCount} items`}>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {alerts.lowStockItems.map((item, i) => (
                      <li key={i}><strong>{item.name}</strong> ({item.current_stock} left)</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '6px' }}>
                    <Link href="/stock" style={{ fontSize: '11.5px', color: '#EF4444', fontWeight: 700 }}>Manage Stock →</Link>
                  </div>
                </AlertRow>
              )}

              {totalAlerts === 0 && !loading && (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={40} style={{ margin: '0 auto 12px', color: 'var(--success)', opacity: 0.6 }} />
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 3px' }}>All Clear!</p>
                  <p style={{ fontSize: '12.5px', margin: 0 }}>No pending actions right now.</p>
                </div>
              )}

              {loading && (
                <div style={{ padding: '36px', display: 'flex', justifyContent: 'center' }}>
                  <div className="loader" />
                </div>
              )}
            </div>
          </div>

          {/* Attendance Snapshot */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '18px', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--accent-blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={15} style={{ color: 'var(--accent-blue)' }} />
              </div>
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Today's Attendance</h2>
            </div>

            {/* Circular progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '18px' }}>
              <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                <svg viewBox="0 0 80 80" style={{ width: '80px', height: '80px', transform: 'rotate(-90deg)' }}>
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--bg-subtle)" strokeWidth="8" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="var(--accent-blue)" strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - attendancePct / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-blue)' }}>{attendancePct}%</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {hrStats.presentToday}<span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 600 }}>/{hrStats.activeStaff}</span>
                </p>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Staff members present today</p>
              </div>
            </div>

            <Link href="/staff/attendance" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px', borderRadius: '10px',
              border: '1.5px solid var(--border-light)',
              background: 'var(--bg-subtle)', color: 'var(--text-secondary)',
              fontWeight: 700, fontSize: '13px', textDecoration: 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; e.currentTarget.style.background = 'var(--accent-blue-dim)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-subtle)' }}
            >
              <UserCheck size={15} /> View Attendance Roster <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 1920px) {
          main { padding: 40px 32px 100px !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  )
}

/* ── Premium Stat Card ── */
function PremiumStat({ title, value, icon, accentColor, subtitle, loading }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-light)',
      borderRadius: '16px', padding: '20px 22px',
      boxShadow: 'var(--shadow-sm)',
      position: 'relative', overflow: 'hidden',
      transition: 'box-shadow 0.2s, transform 0.2s'
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>{title}</p>
          {loading ? (
            <div className="loader" style={{ width: '20px', height: '20px', margin: '10px 0' }} />
          ) : (
            <p style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
              ৳{value.toLocaleString()}
            </p>
          )}
        </div>
        <div style={{ background: accentColor + '18', color: accentColor, padding: '10px', borderRadius: '10px', flexShrink: 0 }}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '10px 0 0', fontWeight: 500 }}>{subtitle}</p>
      {/* Bottom accent bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', background: `linear-gradient(90deg, ${accentColor}cc, ${accentColor}33)` }} />
    </div>
  )
}

/* ── Module Card ── */
function ModuleCard({ href, icon, title, color, desc, badge }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        padding: '16px 12px', borderRadius: '14px',
        border: '1.5px solid var(--border-light)',
        background: 'var(--bg-subtle)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        transition: 'all 0.22s ease', position: 'relative', cursor: 'pointer', minHeight: '100px', justifyContent: 'center'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = `0 8px 20px ${color}25`
        e.currentTarget.style.background = color + '0A'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-light)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.background = 'var(--bg-subtle)'
      }}>
        {badge && (
          <div style={{ position: 'absolute', top: '-7px', right: '-7px', background: '#EF4444', color: 'white', fontSize: '10px', fontWeight: 800, padding: '3px 7px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(239,68,68,0.35)' }}>
            {badge}
          </div>
        )}
        <div style={{ background: color + '18', color: color, padding: '10px', borderRadius: '10px' }}>
          {icon}
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{title}</span>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{desc}</span>
        </div>
      </div>
    </Link>
  )
}

/* ── Alert Row ── */
function AlertRow({ icon, color, title, children }) {
  return (
    <div style={{
      padding: '16px 20px', borderBottom: '1px solid var(--border-light)',
      display: 'flex', gap: '14px', alignItems: 'flex-start',
      transition: 'background 0.15s ease'
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ background: color + '18', color, padding: '8px', borderRadius: '9px', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <h4 style={{ margin: '0 0 5px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h4>
        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {children}
        </p>
      </div>
    </div>
  )
}
