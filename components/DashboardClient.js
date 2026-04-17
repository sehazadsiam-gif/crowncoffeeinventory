'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import {
  ShoppingCart, BookOpen, Package, ClipboardList,
  CheckCircle2, ArrowRight, Wallet, TrendingUp, AlertTriangle, Zap, Calendar,
  Users, UserCheck, FileText
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatsForDate(date)
    
    // Subscribe to realtime database changes so the dashboard updates instantly
    const channel = supabase.channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchStatsForDate(date))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bazar_entries' }, () => fetchStatsForDate(date))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => fetchStatsForDate(date))
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [date])

  async function fetchStatsForDate(selectedDate) {
    setLoading(true)
    try {
      const [salesRes, bazarRes, ingRes, staffRes, attRes, advRes] = await Promise.all([
        supabase.from('sales').select('total_revenue').eq('date', selectedDate),
        supabase.from('bazar_entries').select('total_cost').eq('date', selectedDate),
        supabase.from('ingredients').select('current_stock, cost_per_unit, min_stock'),
        supabase.from('staff').select('base_salary').eq('is_active', true),
        supabase.from('attendance').select('status').eq('date', selectedDate),
        supabase.from('advance_log').select('amount').eq('month', new Date(selectedDate).getMonth() + 1).eq('year', new Date(selectedDate).getFullYear())
      ])

      const totalSales = (salesRes.data || []).reduce((s, row) => s + (row.total_revenue || 0), 0)
      const totalBazar = (bazarRes.data || []).reduce((s, row) => s + (row.total_cost || 0), 0)
      
      const ingredients = ingRes.data || []
      const stockValue = ingredients.reduce((s, i) => s + ((i.current_stock || 0) * (i.cost_per_unit || 0)), 0)
      const lowStockCount = ingredients.filter(i => i.current_stock <= i.min_stock).length

      setStats({ totalSales, totalBazar, stockValue, lowStockCount })

      const activeStaff = staffRes.data?.length || 0
      const payrollEstimate = (staffRes.data || []).reduce((s, row) => s + (Number(row.base_salary) || 0), 0)
      const presentToday = (attRes.data || []).filter(a => a.status === 'present').length
      const pendingAdvances = (advRes.data || []).reduce((s, row) => s + (Number(row.amount) || 0), 0)
      
      setHrStats({ activeStaff, presentToday, payrollEstimate, pendingAdvances })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (e) => {
    setDate(e.target.value)
  }

  return (
    <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 24px 60px' }}>
      
      {/* Header and Date Picker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Overview</h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor your daily sales, expenses, and inventory health.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)', width: 'fit-content' }}>
          <Calendar size={20} style={{ color: 'var(--primary)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={handleDateChange}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        {/* Sales */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ background: 'var(--success-bg)', padding: '12px', borderRadius: '8px', color: 'var(--success)' }}>
              <TrendingUp size={24} />
            </div>
          </div>
          {loading ? <div className="loader" /> : (
            <>
              <p className="stat-value">৳{stats.totalSales.toLocaleString()}</p>
              <p className="stat-label">Sales for {date}</p>
            </>
          )}
        </div>

        {/* Bazar */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ background: 'var(--danger-bg)', padding: '12px', borderRadius: '8px', color: 'var(--danger)' }}>
              <Wallet size={24} />
            </div>
          </div>
          {loading ? <div className="loader" /> : (
            <>
              <p className="stat-value">৳{stats.totalBazar.toLocaleString()}</p>
              <p className="stat-label">Expenses for {date}</p>
            </>
          )}
        </div>

        {/* Inventory Value */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: '8px', color: 'var(--primary)' }}>
              <Package size={24} />
            </div>
          </div>
          {loading ? <div className="loader" /> : (
            <>
              <p className="stat-value">৳{stats.stockValue.toLocaleString()}</p>
              <p className="stat-label">Current Total Stock Value</p>
            </>
          )}
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }} className="dash-grid">
        
        {/* Quick Actions */}
        <div className="card">
          <h2 className="section-label">Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <QuickActionCard href="/sales" icon={<ShoppingCart size={24} />} title="Record Sales" color="var(--success)" bgColor="var(--success-bg)" />
            <QuickActionCard href="/bazar" icon={<ClipboardList size={24} />} title="Log Expenses" color="var(--danger)" bgColor="var(--danger-bg)" />
            <QuickActionCard href="/menu" icon={<BookOpen size={24} />} title="Manage Menu" color="var(--primary)" bgColor="var(--primary-light)" />
            <QuickActionCard href="/stock" icon={<Package size={24} />} title="Check Stock" color="var(--warning)" bgColor="var(--warning-bg)" />
          </div>
        </div>

        {/* Alerts & Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="card" style={{ background: stats.lowStockCount > 0 ? 'var(--warning-bg)' : 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <AlertTriangle size={24} style={{ color: stats.lowStockCount > 0 ? 'var(--warning)' : 'var(--text-muted)' }} />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: stats.lowStockCount > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>Stock Alerts</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {loading ? 'Checking...' : stats.lowStockCount > 0 ? `You have ${stats.lowStockCount} items running low or out of stock.` : 'All items are adequately stocked.'}
                </p>
                {stats.lowStockCount > 0 && (
                  <Link href="/stock" className="btn-secondary" style={{ marginTop: '12px', fontSize: '12px', padding: '6px 12px' }}>
                    View Stock
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} style={{ color: 'var(--warning)' }} /> Daily Flow
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <TaskItem text="Check low stock levels" done={stats.lowStockCount === 0} />
              <TaskItem text="Record daily expenses" done={stats.totalBazar > 0} />
              <TaskItem text="Log daily sales" done={stats.totalSales > 0} />
            </div>
          </div>
          
        </div>
      </div>

      {/* HR Summary Section */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-primary)' }}>HR & Staff Management</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }} className="dash-grid">
          
          <div className="card hr-theme" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--hr-primary)' }}>
              <Users size={20} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, fontFamily: 'var(--font-display)' }}>Staff Summary</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Active Staff</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{hrStats.activeStaff}</p>
              </div>
              <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Attendance Today</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>{hrStats.presentToday} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>/ {hrStats.activeStaff}</span></p>
              </div>
              <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monthly Payroll Est.</p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--hr-primary)' }}>৳{hrStats.payrollEstimate.toLocaleString()}</p>
              </div>
              <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pending Advances</p>
                <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--danger)' }}>৳{hrStats.pendingAdvances.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="card hr-theme">
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--hr-text-primary)' }}>HR Quick Links</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link href="/staff/attendance" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)' }}>
                <div style={{ background: '#e6f4ea', padding: '8px', borderRadius: '6px', color: '#1e8e3e' }}><UserCheck size={18} /></div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '14px' }}>Mark Attendance</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Log today's staff attendance</p>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
              </Link>
              
              <Link href="/staff/payroll" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)' }}>
                <div style={{ background: 'var(--primary-light)', padding: '8px', borderRadius: '6px', color: 'var(--primary)' }}><FileText size={18} /></div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '14px' }}>Run Payroll</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Generate monthly salary and payslips</p>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
              </Link>
              
              <Link href="/staff/advances" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-primary)' }}>
                <div style={{ background: '#fce8e6', padding: '8px', borderRadius: '6px', color: '#d93025' }}><Wallet size={18} /></div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '14px' }}>Log Advance</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Record salary advances taken</p>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
              </Link>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  )
}

function QuickActionCard({ href, icon, title, color, bgColor }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ 
        padding: '20px', borderRadius: '8px', border: '1px solid var(--border-light)', 
        background: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column', 
        alignItems: 'flex-start', gap: '16px', transition: 'all 0.15s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.background = bgColor
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border-light)'
        e.currentTarget.style.background = 'var(--bg-subtle)'
      }}>
        <div style={{ background: bgColor, color: color, padding: '12px', borderRadius: '8px' }}>
          {icon}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
          <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>
    </Link>
  )
}

function TaskItem({ text, done }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
      <CheckCircle2 size={18} style={{ color: done ? 'var(--success)' : 'var(--border-medium)', flexShrink: 0 }} />
      <span style={{ fontSize: '13px', color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none' }}>
        {text}
      </span>
    </div>
  )
}
