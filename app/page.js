import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import DashboardClient from '../components/DashboardClient'

export const revalidate = 0 // Disable cache for now to ensure real-time-ish dashboard

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

  return (
    <div className="min-h-screen bg-[var(--cafe-cream)]">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <section className="mb-10 text-center md:text-left fade-in">
          <h1 className="text-3xl md:text-4xl font-display font-black text-[var(--cafe-brown)] tracking-tight">
            Crown Coffee <span className="text-[var(--cafe-gold)]">Management</span>
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Manage your stock, recipes, and daily sales with ease.</p>
        </section>

        <DashboardClient initialStats={stats} initialLowStock={lowStockItems} />
      </main>
    </div>
  )
}
