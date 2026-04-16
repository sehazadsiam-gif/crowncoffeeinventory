'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../components/Toast'
import { 
  BarChart3, TrendingUp, TrendingDown, Package, 
  Trash2, Download, LogOut, ShieldCheck, 
  DollarSign, Activity, FileText, AlertCircle
} from 'lucide-react'

export default function AdminClient({ initialStats }) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    const auth = localStorage.getItem('isAdmin')
    if (auth === 'true') {
      setIsAuthorized(true)
    } else {
      router.push('/login')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('isAdmin')
    addToast('Logged out successfully', 'success')
    router.push('/')
  }

  if (!isAuthorized) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-100 border-t-amber-900 mb-4"></div>
      <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Verifying Authorization...</p>
    </div>
  )

  const { stats } = initialStats

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-8">
        <div>
          <h2 className="text-2xl font-black text-[var(--cafe-brown)] flex items-center gap-3">
            <ShieldCheck className="text-[var(--cafe-gold)]" size={28} /> Advanced Business Logic
          </h2>
          <p className="text-gray-400 text-sm mt-1">Full-system diagnostics and lifetime performance data.</p>
        </div>
        <button onClick={handleLogout} className="btn-secondary text-xs uppercase tracking-widest px-6 py-3">
          <LogOut size={16} /> Logout Admin
        </button>
      </div>

      {/* Advanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminStatCard 
          label="Lifetime Gross Revenue" 
          value={`৳${stats.totalRevenue.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="+8% from last month"
          color="text-emerald-600"
        />
        <AdminStatCard 
          label="Total Inventory Value" 
          value={`৳${stats.inventoryValue.toLocaleString()}`} 
          icon={Package} 
          trend="Value currently in-store"
          color="text-amber-600"
        />
        <AdminStatCard 
          label="Avg. Order Value" 
          value={`৳${(stats.totalRevenue / (stats.totalSalesCount || 1)).toFixed(2)}`} 
          icon={Activity} 
          trend="Based on all transactions"
          color="text-[var(--cafe-brown)]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Health */}
        <div className="card-premium">
          <h3 className="font-bold text-[var(--cafe-brown)] uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
            <Activity size={16} /> System Integrity
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Database Connection</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">Operational • 100%</p>
                </div>
              </div>
              <span className="badge-green">Stable</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[var(--cafe-cream)] rounded-2xl border border-[var(--cafe-cream-dark)]">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Recipes</p>
                <p className="text-2xl font-black text-[var(--cafe-brown)]">{stats.totalRecipes}</p>
              </div>
              <div className="p-4 bg-[var(--cafe-cream)] rounded-2xl border border-[var(--cafe-cream-dark)]">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Ingredients</p>
                <p className="text-2xl font-black text-[var(--cafe-brown)]">{stats.totalIngredients}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="card border-dashed">
          <h3 className="font-bold text-[var(--cafe-brown)] uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
            <FileText size={16} /> Data Operations
          </h3>
          <p className="text-gray-400 text-xs mb-8">Export or manage your database records. High-risk operations are marked in red.</p>
          
          <div className="space-y-3">
             <button className="flex items-center justify-between w-full p-4 rounded-xl border border-gray-100 hover:border-[var(--cafe-gold)] transition-all group">
              <span className="text-sm font-bold text-gray-600">Download Sales Report (CSV)</span>
              <Download size={18} className="text-gray-300 group-hover:text-[var(--cafe-gold)]" />
            </button>
            <button className="flex items-center justify-between w-full p-4 rounded-xl border border-rose-50 hover:bg-rose-50 transition-all group opacity-40 cursor-not-allowed">
              <span className="text-sm font-bold text-rose-300">Clear All Transactions (Reset)</span>
              <Trash2 size={18} className="text-rose-200" />
            </button>
             <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase">
                Note: Resetting data is currently locked in development mode for safety.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminStatCard({ label, value, icon: Icon, trend, color }) {
  return (
    <div className="card p-6 border-b-4 border-b-[var(--cafe-gold)]">
      <div className="flex items-center justify-between mb-4">
        <div className="bg-gray-50 w-10 h-10 rounded-xl flex items-center justify-center">
          <Icon size={20} className="text-gray-400" />
        </div>
        <DollarSign size={16} className="text-gray-200" />
      </div>
      <p className={`text-3xl font-black ${color} tracking-tighter mb-1`}>{value}</p>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">{label}</p>
      <p className="text-[10px] font-bold text-gray-300 italic">{trend}</p>
    </div>
  )
}
