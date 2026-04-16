import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import AdminClient from '../../components/AdminClient'

export const revalidate = 0

async function getAdminStats() {
  try {
    const [salesRes, ingRes, recipeRes] = await Promise.all([
      supabase.from('sales').select('total_revenue, quantity'),
      supabase.from('ingredients').select('count, current_stock, cost_per_unit', { count: 'exact' }),
      supabase.from('recipes').select('id', { count: 'exact' }),
    ])

    const totalRevenue = (salesRes.data || []).reduce((s, e) => s + (e.total_revenue || 0), 0)
    const totalSalesCount = (salesRes.data || []).reduce((s, e) => s + (s.quantity || 0), 0)
    
    const ingredients = ingRes.data || []
    const inventoryValue = ingredients.reduce((s, i) => s + ((i.current_stock || 0) * (i.cost_per_unit || 0)), 0)

    return {
      stats: {
        totalRevenue,
        totalSalesCount,
        inventoryValue,
        totalIngredients: ingRes.count || 0,
        totalRecipes: recipeRes.count || 0
      }
    }
  } catch (error) {
    console.error('Admin fetch error:', error)
    return {
      stats: { totalRevenue: 0, totalSalesCount: 0, inventoryValue: 0, totalIngredients: 0, totalRecipes: 0 }
    }
  }
}

export default async function AdminPage() {
  const data = await getAdminStats()

  return (
    <div className="min-h-screen bg-[var(--cafe-cream)]">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <AdminClient initialStats={data} />
      </main>
    </div>
  )
}
