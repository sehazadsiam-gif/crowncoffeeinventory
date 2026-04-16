'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { useToast } from '../components/Toast'
import {
  ShoppingCart, BookOpen, Package, BarChart2,
  AlertTriangle, TrendingUp, Coffee, ClipboardList,
  CheckCircle2, ArrowRight, Wallet, Activity
} from 'lucide-react'

export default function Dashboard() {
  const { addToast } = useToast()
  const [stats, setStats] = useState({
    totalMenuItems: 0,
    lowStockCount: 0,
    todayBazarCost: 0,
    todayRevenue: 0,
    todaySalesCount: 0,
  })
  const [lowStockItems, setLowStockItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const today = new Date().toISOString().split('T')[0]

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

      setStats({
        totalMenuItems: menuRes.count || 0,
        lowStockCount: low.length,
        todayBazarCost: bazarTotal,
        todayRevenue: revenue,
        todaySalesCount: salesCount,
      })
      setLowStockItems(low.slice(0, 5))
    } catch (error) {
      addToast('Failed to fetch dashboard data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const checklistItems = [
    { step: 1, label: 'Add your ingredients', href: '/menu', done: stats.totalMenuItems > 0 || stats.lowStockCount > 0 },
    { step: 2, label: 'Add menu items and recipes', href: '/menu', done: stats.totalMenuItems > 0 },
    { step: 3, label: "Log today's bazar purchases", href: '/bazar', done: stats.todayBazarCost > 0 },
    { step: 4, label: "Enter today's sales", href: '/sales', done: stats.todaySalesCount > 0 },
  ]

  return (
    <div className="min-h-screen bg-[var(--cafe-cream)]">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header Section */}
        <section className="mb-10 text-center md:text-left fade-in">
          <h1 className="text-3xl md:text-4xl font-display font-black text-[var(--cafe-brown)] tracking-tight">
            Crown Coffee <span className="text-[var(--cafe-gold)]">Management</span>
          </h1>
          <p className="text-gray-500 mt-2 text-lg">Manage your stock, recipes, and daily sales with ease.</p>
        </section>

        {/* Loading Overlay */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--cafe-cream-dark)] border-t-[var(--cafe-brown)]"></div>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 fade-in">
            {/* Left Column: Stats & Guidance */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Welcome Banner / Checklist */}
              {(stats.totalMenuItems === 0) ? (
                <div className="instruction-box">
                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-2">Welcome to Crown Coffee!</h2>
                    <p className="opacity-90 mb-6">Let's get your inventory set up. Follow these simple steps to start tracking your business.</p>
                    <div className="grid gap-3">
                      {checklistItems.map((item) => (
                        <Link key={item.step} href={item.href}>
                          <div className={`flex items-center justify-between p-4 rounded-xl transition-all ${item.done ? 'bg-white/20' : 'bg-white text-[var(--cafe-brown)] hover:scale-[1.02]'}`}>
                            <div className="flex items-center gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${item.done ? 'bg-emerald-400 text-white' : 'bg-[var(--cafe-brown)] text-white'}`}>
                                {item.done ? <CheckCircle2 size={14} /> : item.step}
                              </span>
                              <span className={`font-semibold ${item.done ? 'line-through opacity-70' : ''}`}>{item.label}</span>
                            </div>
                            <ArrowRight size={18} className={item.done ? 'opacity-30' : 'opacity-100'} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <Coffee className="absolute -bottom-6 -right-6 text-white/10 w-48 h-48 rotate-12" />
                </div>
              ) : (
                <div className="card-premium">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                    <Activity size={16} /> Business Setup Progress
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {checklistItems.map((item) => (
                      <Link key={item.step} href={item.href} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.done ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100 hover:border-[var(--cafe-gold)] whitespace-nowrap'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {item.done ? <CheckCircle2 size={18} /> : <span className="text-sm font-bold">{item.step}</span>}
                        </div>
                        <span className={`text-sm font-bold ${item.done ? 'text-emerald-700' : 'text-gray-600'}`}>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's Stats Grid */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[var(--cafe-brown)] flex items-center gap-2">
                    <TrendingUp size={20} className="text-[var(--cafe-gold)]" /> Today's Performance
                  </h2>
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-tighter">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Sales Revenue" value={`৳${stats.todayRevenue.toFixed(0)}`} icon={Wallet} color="text-emerald-600" />
                  <StatCard label="Bazar Cost" value={`৳${stats.todayBazarCost.toFixed(0)}`} icon={ShoppingCart} color="text-amber-600" />
                  <StatCard label="Net Profit" value={`৳${(stats.todayRevenue - stats.todayBazarCost).toFixed(0)}`} icon={TrendingUp} color={(stats.todayRevenue - stats.todayBazarCost) >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
                  <StatCard label="Items Sold" value={stats.todaySalesCount} icon={ClipboardList} color="text-[var(--cafe-brown)]" />
                </div>
              </section>
            </div>

            {/* Right Column: Alerts & Side Actions */}
            <div className="space-y-6">
              {/* Low Stock Card */}
              <div className={`card overflow-hidden border-t-8 ${lowStockItems.length > 0 ? 'border-rose-500' : 'border-emerald-500'}`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tight">
                    {lowStockItems.length > 0 ? <AlertTriangle className="text-rose-500" size={18} /> : <CheckCircle2 className="text-emerald-500" size={18} />}
                    Stock Status
                  </h3>
                  <Link href="/stock" className="text-xs font-bold text-[var(--cafe-brown)] hover:underline uppercase tracking-widest">View All</Link>
                </div>
                
                {lowStockItems.length > 0 ? (
                  <div className="space-y-3">
                    {lowStockItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100">
                        <div>
                          <p className="text-sm font-bold text-rose-900 leading-none">{item.name}</p>
                          <p className="text-[10px] uppercase font-bold text-rose-400 mt-1">{item.current_stock} {item.unit} left</p>
                        </div>
                        <span className="badge-red">Low</span>
                      </div>
                    ))}
                    <p className="text-[11px] text-gray-400 text-center pt-2 italic">Low stock affects your sales potential.</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 size={24} className="text-emerald-500" />
                    </div>
                    <p className="text-sm font-bold text-gray-800">All Good!</p>
                    <p className="text-xs text-gray-400 mt-1 px-4 text-pretty">No critical stock warnings at the moment.</p>
                  </div>
                )}
              </div>

              {/* Quick Navigation Card */}
              <div className="card bg-[var(--cafe-brown)] text-white">
                <h3 className="font-bold mb-4 uppercase text-xs tracking-widest opacity-60">System Navigation</h3>
                <div className="grid gap-2">
                  <QuickNavLink href="/menu" label="Menu & Recipes" icon={BookOpen} />
                  <QuickNavLink href="/bazar" label="Daily Bazar" icon={ShoppingCart} />
                  <QuickNavLink href="/sales" label="Record Sales" icon={ClipboardList} />
                  <QuickNavLink href="/stock" label="Stock Manager" icon={Package} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card p-5 group hover:border-[var(--cafe-gold)] transition-colors">
      <div className="bg-gray-50 w-8 h-8 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[var(--cafe-cream-dark)] transition-colors">
        <Icon size={16} className="text-gray-400 group-hover:text-[var(--cafe-brown)]" />
      </div>
      <p className={`text-xl md:text-2xl font-black ${color} tracking-tight`}>{value}</p>
      <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mt-1">{label}</p>
    </div>
  )
}

function QuickNavLink({ href, label, icon: Icon }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-colors group">
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-[var(--cafe-gold)] group-hover:text-[var(--cafe-brown)] transition-colors">
        <Icon size={16} />
      </div>
      <span className="text-sm font-bold">{label}</span>
      <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
    </Link>
  )
}
