'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import {
  ShoppingCart, BookOpen, Package, ClipboardList,
  CheckCircle2, ArrowRight, Wallet, TrendingUp, AlertTriangle, Zap, Calendar
} from 'lucide-react'

export default function DashboardClient() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [stats, setStats] = useState({
    totalSales: 0,
    totalBazar: 0,
    stockValue: 0,
    lowStockCount: 0,
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
      const [salesRes, bazarRes, ingRes] = await Promise.all([
        supabase.from('sales').select('total_revenue').eq('date', selectedDate),
        supabase.from('bazar_entries').select('total_cost').eq('date', selectedDate),
        supabase.from('ingredients').select('current_stock, cost_per_unit, min_stock')
      ])

      const totalSales = (salesRes.data || []).reduce((s, row) => s + (row.total_revenue || 0), 0)
      const totalBazar = (bazarRes.data || []).reduce((s, row) => s + (row.total_cost || 0), 0)
      
      const ingredients = ingRes.data || []
      const stockValue = ingredients.reduce((s, i) => s + ((i.current_stock || 0) * (i.cost_per_unit || 0)), 0)
      const lowStockCount = ingredients.filter(i => i.current_stock <= i.min_stock).length

      setStats({ totalSales, totalBazar, stockValue, lowStockCount })
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
