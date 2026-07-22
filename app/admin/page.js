'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/Navbar'
import AdminClient from '../../components/AdminClient'
import { useSessionTimeout } from '../../hooks/useSessionTimeout'

export default function AdminPage() {
  const router = useRouter()
  const [data, setData] = useState({ stats: { totalRevenue: 0, totalSalesCount: 0, inventoryValue: 0, totalIngredients: 0, totalRecipes: 0 } })
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // 15-minute idle session timeout for admin
  useSessionTimeout(isAdmin)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (!token || role !== 'admin') {
      router.replace('/')
      return
    }
    setIsAdmin(true)
    fetchAdminStats()
  }, [router])

  async function fetchAdminStats() {
    try {
      setLoading(true)
      const [salesRes, ingRes, recipeRes] = await Promise.all([
        supabase.from('sales').select('total_revenue, quantity'),
        supabase.from('ingredients').select('count, current_stock, cost_per_unit', { count: 'exact' }),
        supabase.from('recipes').select('id', { count: 'exact' }),
      ])

      const totalRevenue = (salesRes.data || []).reduce((s, e) => s + (e.total_revenue || 0), 0)
      const totalSalesCount = (salesRes.data || []).reduce((s, e) => s + (e.quantity || 0), 0)
      
      const ingredients = ingRes.data || []
      const inventoryValue = ingredients.reduce((s, i) => s + ((i.current_stock || 0) * (i.cost_per_unit || 0)), 0)

      setData({
        stats: {
          totalRevenue,
          totalSalesCount,
          inventoryValue,
          totalIngredients: ingRes.count || 0,
          totalRecipes: recipeRes.count || 0
        }
      })
    } catch (error) {
      console.error('Admin fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div className="loader"></div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      <AdminClient initialStats={data} />
    </div>
  )
}
