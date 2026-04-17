import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import DashboardClient from '../components/DashboardClient'

export const revalidate = 0

async function getStats() {
  const today = new Date().toISOString().split('T')[0]

  try {
    const [menuRes, ingredientRes, bazarRes, salesRes] = await Promise.all([
      supabase.from('menu_items').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('ingredients').select('*'),
      supabase.from('bazar_entries').select('total_cost').eq('date', today),
      supabase.from('sales').select('total_revenue, quantity').eq('date', today),
    ])

    const ingredients = ingredientRes.data || []
    const low = ingredients.filter(i => i.current_stock <= i.min_stock)
    const bazarTotal = (bazarRes.data || []).reduce((s, e) => s + (e.total_cost || 0), 0)
    const revenue = (salesRes.data || []).reduce((s, e) => s + (e.total_revenue || 0), 0)
    const salesCount = (salesRes.data || []).reduce((s, e) => s + (e.quantity || 0), 0)

    return {
      stats: {
        totalMenuItems: menuRes.count || 0,
        lowStockCount: low.length,
        todayBazarCost: bazarTotal,
        todayRevenue: revenue,
        todaySalesCount: salesCount,
      },
      lowStockItems: low.slice(0, 5)
    }
  } catch (error) {
    console.error('Dashboard fetch error:', error)
    return {
      stats: { totalMenuItems: 0, lowStockCount: 0, todayBazarCost: 0, todayRevenue: 0, todaySalesCount: 0 },
      lowStockItems: []
    }
  }
}

export default async function Dashboard() {
  const { stats, lowStockItems } = await getStats()
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />

      {/* Hero Header */}
      <header style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-light)',
        padding: '40px 0 32px',
      }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1.15,
            }}>Crown Coffee</h1>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginTop: '6px',
            }}>Inventory and Stock Management</p>
            <div style={{
              marginTop: '12px',
              width: '60px',
              height: '1px',
              background: 'var(--accent-gold)',
            }} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              lineHeight: 1.2,
            }}>{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}</p>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '36px 24px 60px' }}>
        <DashboardClient initialStats={stats} initialLowStock={lowStockItems} />
      </main>
    </div>
  )
}
