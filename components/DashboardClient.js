'use client'

import Link from 'next/link'
import {
  ShoppingCart, BookOpen, Package, ClipboardList,
  CheckCircle2, ArrowRight, Wallet, TrendingUp, AlertTriangle, Zap
} from 'lucide-react'

export default function DashboardClient({ initialStats, initialLowStock }) {
  const stats = initialStats
  const lowStockItems = initialLowStock

  const checklistItems = [
    { step: 1, label: 'Add your ingredients', href: '/menu', done: stats.totalMenuItems > 0 || stats.lowStockCount > 0 },
    { step: 2, label: 'Add menu items and recipes', href: '/menu', done: stats.totalMenuItems > 0 },
    { step: 3, label: "Log today's bazar purchases", href: '/bazar', done: stats.todayBazarCost > 0 },
    { step: 4, label: "Enter today's sales", href: '/sales', done: stats.todaySalesCount > 0 },
  ]

  const net = stats.todayRevenue - stats.todayBazarCost
  const isProfit = net >= 0

  return (
    <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>

      {/* Stats Row */}
      <section>
        <p className="section-label">Today's Performance</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <StatCard
            label="Sales Revenue"
            value={`৳${stats.todayRevenue.toFixed(0)}`}
            borderColor="var(--success)"
          />
          <StatCard
            label="Bazar Cost"
            value={`৳${stats.todayBazarCost.toFixed(0)}`}
            borderColor="var(--warning)"
          />
          <StatCard
            label="Net Profit"
            value={`৳${net.toFixed(0)}`}
            borderColor="var(--accent-brown)"
            valueColor={isProfit ? 'var(--success)' : 'var(--danger)'}
          />
          <StatCard
            label="Items Sold"
            value={stats.todaySalesCount}
            borderColor="var(--accent-gold)"
          />
        </div>
      </section>

      {/* Two Column: Checklist + Low Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>

        {/* Getting Started / Progress */}
        <div>
          <p className="section-label">Setup Checklist</p>
          <div className="card" style={{ borderLeft: '3px solid var(--accent-gold)' }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '20px',
            }}>Getting Started</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {checklistItems.map((item) => (
                <Link key={item.step} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: item.done ? 'var(--success-bg)' : 'var(--bg-subtle)',
                    border: `1px solid ${item.done ? 'rgba(58,125,92,0.15)' : 'var(--border-light)'}`,
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: item.done ? 'var(--success)' : 'var(--accent-brown)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {item.done ? <CheckCircle2 size={13} /> : item.step}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        color: item.done ? 'var(--success)' : 'var(--text-secondary)',
                        textDecoration: item.done ? 'line-through' : 'none',
                        opacity: item.done ? 0.8 : 1,
                      }}>{item.label}</span>
                    </div>
                    <ArrowRight size={14} style={{ color: 'var(--text-muted)', opacity: item.done ? 0.3 : 0.7 }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div>
          <p className="section-label">Stock Alerts</p>
          <div className="card" style={{
            borderLeft: lowStockItems.length > 0 ? '3px solid var(--danger)' : '3px solid var(--success)',
            background: lowStockItems.length > 0 ? 'rgba(166,60,60,0.02)' : 'var(--bg-surface)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>Stock Status</h3>
              <Link href="/stock" style={{
                fontFamily: 'var(--font-body)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--accent-brown)',
                textDecoration: 'none',
              }}>View All</Link>
            </div>

            {lowStockItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lowStockItems.map(item => (
                  <div key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--danger-bg)',
                    borderRadius: '8px',
                    border: '1px solid rgba(166,60,60,0.12)',
                  }}>
                    <div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {item.name}
                      </p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
                        {item.current_stock} {item.unit} remaining
                      </p>
                    </div>
                    <span className="badge badge-red">Low</span>
                  </div>
                ))}
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  marginTop: '8px',
                  fontStyle: 'italic',
                }}>Low stock affects your sales potential.</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={28} style={{ color: 'var(--success)', margin: '0 auto 8px' }} />
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>All Good</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>No critical stock warnings.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <section>
        <p className="section-label">Quick Access</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { href: '/menu', icon: BookOpen, title: 'Menu & Recipes', desc: 'Manage items, ingredients and recipes' },
            { href: '/bazar', icon: ShoppingCart, title: 'Daily Bazar', desc: 'Log today\'s ingredient purchases' },
            { href: '/sales', icon: ClipboardList, title: 'Record Sales', desc: 'Enter daily sales and update stock' },
            { href: '/stock', icon: Package, title: 'Stock Manager', desc: 'View and adjust inventory levels' },
          ].map(({ href, icon: Icon, title, desc }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderLeftColor = 'var(--accent-brown)'
                  e.currentTarget.style.borderLeftWidth = '3px'
                  e.currentTarget.style.background = 'var(--bg-subtle)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderLeftColor = 'var(--border-light)'
                  e.currentTarget.style.borderLeftWidth = '1px'
                  e.currentTarget.style.background = 'var(--bg-surface)'
                }}
              >
                <Icon size={18} style={{ color: 'var(--accent-brown)', marginBottom: '12px' }} strokeWidth={1.5} />
                <h4 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                }}>{title}</h4>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}>{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  )
}

function StatCard({ label, value, borderColor, valueColor }) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${borderColor}` }}>
      <p className="stat-value" style={{ color: valueColor || 'var(--accent-brown)' }}>{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  )
}
