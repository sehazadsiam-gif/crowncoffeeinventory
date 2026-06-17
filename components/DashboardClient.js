'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import {
  ShoppingCart, BookOpen, Package, ClipboardList,
  CheckCircle2, ArrowRight, Wallet, TrendingUp, AlertTriangle, Calendar,
  Users, UserCheck, FileText, Send, MessageSquare, Clock, BellRing, Box, Zap, CalendarDays
} from 'lucide-react'

export default function DashboardClient() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [stats, setStats] = useState({
    totalSales: 0,
    totalBazar: 0,
    stockValue: 0,
    lowStockCount: 0,
  })
  const [hrStats, setHrStats] = useState({
    activeStaff: 0,
    presentToday: 0,
    pendingAdvances: 0,
    payrollEstimate: 0
  })
  const [alerts, setAlerts] = useState({
    pendingLeaves: [],
    unreadMessages: [],
    lowStockItems: []
  })
  const [broadcast, setBroadcast] = useState({ subject: '', message: '', sending: false, status: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatsForDate(date)
    
    const channel = supabase.channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchStatsForDate(date))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bazar_entries' }, () => fetchStatsForDate(date))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => fetchStatsForDate(date))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => fetchStatsForDate(date))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_messages' }, () => fetchStatsForDate(date))
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
        supabase.from('staff_messages').select('*, staff:staff_id(name)').eq('is_read', false)
      ])

      const totalSales = (salesRes.data || []).reduce((s, row) => s + (row.total_revenue || 0), 0)
      const totalBazar = (bazarRes.data || []).reduce((s, row) => s + (row.total_cost || 0), 0)
      
      const ingredients = ingRes.data || []
      const stockValue = ingredients.reduce((s, i) => s + ((i.current_stock || 0) * (i.cost_per_unit || 0)), 0)
      const lowStockItems = ingredients.filter(i => i.current_stock <= i.min_stock)

      setStats({ totalSales, totalBazar, stockValue, lowStockCount: lowStockItems.length })

      const activeStaff = staffRes.data?.length || 0
      const payrollEstimate = (staffRes.data || []).reduce((s, row) => s + (Number(row.base_salary) || 0), 0)
      const presentToday = (attRes.data || []).filter(a => a.status === 'present').length
      const pendingAdvances = (advRes.data || []).reduce((s, row) => s + (Number(row.amount) || 0), 0)
      
      setHrStats({ activeStaff, presentToday, payrollEstimate, pendingAdvances })

      setAlerts({
        pendingLeaves: leaveRes.data || [],
        unreadMessages: msgRes.data || [],
        lowStockItems: lowStockItems.slice(0, 5) // Show top 5 low stock
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleBroadcast = async (e) => {
    e.preventDefault()
    if (!broadcast.subject || !broadcast.message) return
    setBroadcast(prev => ({ ...prev, sending: true, status: null }))
    try {
      const { data: staff } = await supabase.from('staff').select('email, name').eq('is_active', true).not('email', 'is', null)
      if (!staff || staff.length === 0) throw new Error('No staff with emails found')
      
      // We loop over staff and send emails. In a real scenario you'd have an API that takes an array
      const promises = staff.map(s => 
        fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'broadcast', to: s.email, name: s.name, subject: broadcast.subject, message: broadcast.message })
        })
      )
      await Promise.all(promises)
      setBroadcast({ subject: '', message: '', sending: false, status: 'success' })
      setTimeout(() => setBroadcast(prev => ({ ...prev, status: null })), 3000)
    } catch (error) {
      console.error('Broadcast failed:', error)
      setBroadcast(prev => ({ ...prev, sending: false, status: 'error' }))
    }
  }

  const handleDateChange = (e) => {
    setDate(e.target.value)
  }

  const totalAlerts = alerts.pendingLeaves.length + alerts.unreadMessages.length + stats.lowStockCount

  return (
    <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px 60px' }}>
      
      {/* Header and Date Picker */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Command Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '4px' }}>Overview and real-time alerts for your cafe operations.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <Calendar size={20} style={{ color: 'var(--primary)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Filter</label>
            <input 
              type="date" 
              value={date} 
              onChange={handleDateChange}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
            />
          </div>
        </div>
      </div>

      {/* Main Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard title="Daily Sales" value={stats.totalSales} icon={<TrendingUp size={24} />} color="var(--success)" date={date} loading={loading} />
        <StatCard title="Daily Expenses" value={stats.totalBazar} icon={<Wallet size={24} />} color="var(--danger)" date={date} loading={loading} />
        <StatCard title="Total Stock Value" value={stats.stockValue} icon={<Package size={24} />} color="var(--primary)" subtitle="Current estimated value" loading={loading} />
        <StatCard title="Payroll Estimate" value={hrStats.payrollEstimate} icon={<Users size={24} />} color="var(--hr-primary)" subtitle="Based on active staff base salary" loading={loading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '24px', alignItems: 'start' }} className="dash-grid">
        
        {/* Left Column: Navigation & Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Quick Access Navigation Grid */}
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} style={{ color: 'var(--warning)' }} /> Quick Modules
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <ModuleLink href="/sales" icon={<ShoppingCart size={24} />} title="Sales POS" color="var(--success)" />
              <ModuleLink href="/menu" icon={<BookOpen size={24} />} title="Menu Mgmt" color="var(--primary)" />
              <ModuleLink href="/bazar" icon={<ClipboardList size={24} />} title="Bazar Entry" color="var(--danger)" />
              <ModuleLink href="/stock" icon={<Box size={24} />} title="Inventory" color="var(--warning)" badge={stats.lowStockCount > 0 ? stats.lowStockCount : null} />
              <ModuleLink href="/staff/attendance" icon={<UserCheck size={24} />} title="Attendance" color="var(--hr-primary)" />
              <ModuleLink href="/staff/payroll" icon={<FileText size={24} />} title="Payroll" color="var(--hr-primary)" />
              <ModuleLink href="/staff/leave-requests" icon={<CalendarDays size={24} />} title="Leave Requests" color="#f59e0b" badge={alerts.pendingLeaves.length > 0 ? alerts.pendingLeaves.length : null} />
            </div>
          </div>

          {/* Quick Broadcast Tool */}
          <div className="card" style={{ padding: '24px', background: 'linear-gradient(to bottom right, var(--bg-surface), #f8fafc)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={20} style={{ color: '#3b82f6' }} /> Broadcast Announcement
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Send an instant email to all active staff members.</p>
            <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input 
                type="text" 
                placeholder="Subject" 
                className="input" 
                required 
                value={broadcast.subject}
                onChange={e => setBroadcast({...broadcast, subject: e.target.value})}
                style={{ background: 'white' }}
              />
              <textarea 
                placeholder="Type your message here..." 
                className="input" 
                required 
                rows={3}
                value={broadcast.message}
                onChange={e => setBroadcast({...broadcast, message: e.target.value})}
                style={{ background: 'white', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: broadcast.status === 'success' ? 'var(--success)' : broadcast.status === 'error' ? 'var(--danger)' : 'transparent' }}>
                  {broadcast.status === 'success' ? '✓ Sent successfully!' : broadcast.status === 'error' ? '❌ Failed to send' : '...'}
                </span>
                <button type="submit" disabled={broadcast.sending || !broadcast.subject || !broadcast.message} style={{
                  padding: '10px 20px', borderRadius: '8px', background: '#3b82f6', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: (broadcast.sending || !broadcast.subject || !broadcast.message) ? 0.6 : 1
                }}>
                  {broadcast.sending ? 'Sending...' : <><Send size={16} /> Send to All</>}
                </button>
              </div>
            </form>
          </div>
          
        </div>

        {/* Right Column: Action Center */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: totalAlerts > 0 ? '1px solid #fecaca' : '1px solid var(--border-light)' }}>
            <div style={{ padding: '20px 24px', background: totalAlerts > 0 ? '#fef2f2' : 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: totalAlerts > 0 ? '#b91c1c' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <BellRing size={20} /> Action Center
              </h2>
              {totalAlerts > 0 && (
                <span style={{ background: '#ef4444', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>
                  {totalAlerts} Pending
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', background: 'white' }}>
              
              {/* Leave Requests */}
              {alerts.pendingLeaves.map(leave => (
                <ActionItem key={leave.id} icon={<Clock size={18} />} color="#f59e0b" title="Pending Leave Request">
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{leave.staff?.name}</span> requested <span style={{ textTransform: 'capitalize' }}>{leave.leave_type}</span> leave from {new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}.
                  <div style={{ marginTop: '8px' }}>
                    <Link href="/staff/leave-requests" style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, textDecoration: 'none' }}>Review Request &rarr;</Link>
                  </div>
                </ActionItem>
              ))}

              {/* Unread Messages */}
              {alerts.unreadMessages.map(msg => (
                <ActionItem key={msg.id} icon={<MessageSquare size={18} />} color="#3b82f6" title="Unread Staff Message">
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{msg.staff?.name}</span> sent a message on {new Date(msg.created_at).toLocaleDateString()}.
                  <div style={{ marginTop: '8px' }}>
                    <Link href="/staff/messages" style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>Read Message &rarr;</Link>
                  </div>
                </ActionItem>
              ))}

              {/* Low Stock Alerts */}
              {alerts.lowStockItems.length > 0 && (
                <ActionItem icon={<AlertTriangle size={18} />} color="#ef4444" title="Low Stock Alert">
                  You have {stats.lowStockCount} items low on stock. 
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {alerts.lowStockItems.map((item, idx) => <li key={idx}><strong>{item.name}</strong> ({item.current_stock} left)</li>)}
                  </ul>
                  <div style={{ marginTop: '8px' }}>
                    <Link href="/stock" style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700, textDecoration: 'none' }}>Manage Inventory &rarr;</Link>
                  </div>
                </ActionItem>
              )}

              {/* Empty State */}
              {totalAlerts === 0 && !loading && (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={48} style={{ margin: '0 auto 16px', color: 'var(--success)', opacity: 0.5 }} />
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>All Caught Up!</p>
                  <p style={{ fontSize: '13px', margin: 0 }}>No pending actions require your attention.</p>
                </div>
              )}
              {loading && <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}><div className="loader"></div></div>}

            </div>
          </div>

          {/* Today's Attendance Snapshot */}
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} style={{ color: 'var(--hr-primary)' }} /> Today's Attendance
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '32px', fontWeight: 800, color: 'var(--hr-primary)', margin: 0 }}>{hrStats.presentToday}<span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/{hrStats.activeStaff}</span></p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Staff members present</p>
              </div>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '8px solid var(--bg-subtle)', borderTopColor: 'var(--hr-primary)', transform: 'rotate(-45deg)' }} />
            </div>
            <Link href="/staff/attendance" className="btn-secondary" style={{ display: 'block', textAlign: 'center', marginTop: '20px', textDecoration: 'none' }}>View Attendance Roster</Link>
          </div>

        </div>

      </div>

      <style>{`
        @media (max-width: 992px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  )
}

function StatCard({ title, value, icon, color, date, subtitle, loading }) {
  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px 0' }}>{title}</p>
          {loading ? <div className="loader" style={{ width: '20px', height: '20px', margin: '10px 0' }} /> : (
            <p style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              ৳{value.toLocaleString()}
            </p>
          )}
        </div>
        <div style={{ background: color + '15', color: color, padding: '14px', borderRadius: '12px' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
        {date ? `For ${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : subtitle}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, height: '4px', width: '100%', background: color, opacity: 0.8 }} />
    </div>
  )
}

function ModuleLink({ href, icon, title, color, badge }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ 
        padding: '20px 16px', borderRadius: '12px', border: '1px solid var(--border-light)', 
        background: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column', 
        alignItems: 'center', gap: '12px', transition: 'all 0.2s ease', position: 'relative'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-light)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}>
        {badge && (
          <div style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 800, padding: '4px 8px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(239,68,68,0.3)' }}>
            {badge}
          </div>
        )}
        <div style={{ background: color + '15', color: color, padding: '12px', borderRadius: '12px' }}>
          {icon}
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{title}</span>
      </div>
    </Link>
  )
}

function ActionItem({ icon, color, title, children }) {
  return (
    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '16px', alignItems: 'flex-start', transition: 'background 0.2s ease' }}
      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ background: color + '15', color: color, padding: '10px', borderRadius: '10px', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h4>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {children}
        </p>
      </div>
    </div>
  )
}
