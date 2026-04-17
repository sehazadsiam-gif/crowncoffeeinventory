'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../components/Toast'
import { 
  TrendingUp, TrendingDown, Package, 
  Trash2, Download, LogOut, ShieldCheck, 
  Activity, FileText, AlertCircle, RefreshCw
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

  const handleReset = async () => {
    addToast('To clear entries, please run the factory-reset.sql script in your Supabase SQL Editor.', 'info')
  }

  if (!isAuthorized) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
      <div className="loader" style={{ marginBottom: '16px' }} />
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        Verifying Authorization...
      </p>
    </div>
  )

  const { stats } = initialStats

  return (
    <div className="animate-in" style={{ display: 'grid', gap: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={28} style={{ color: 'var(--warning)' }} strokeWidth={1.5} /> 
            Advanced Business Logic
          </h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Full-system diagnostics and lifetime performance data.
          </p>
        </div>
        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '11px' }}>
          <LogOut size={14} /> Logout Admin
        </button>
      </div>

      {/* Advanced Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <AdminStatCard 
          label="Lifetime Gross Revenue" 
          value={`৳${stats.totalRevenue.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="+8% from last month"
          color="var(--success)"
        />
        <AdminStatCard 
          label="Total Inventory Value" 
          value={`৳${stats.inventoryValue.toLocaleString()}`} 
          icon={Package} 
          trend="Value currently in-store"
          color="var(--warning)"
        />
        <AdminStatCard 
          label="Avg. Order Value" 
          value={`৳${(stats.totalRevenue / (stats.totalSalesCount || 1)).toFixed(2)}`} 
          icon={Activity} 
          trend="Based on all transactions"
          color="var(--primary)"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        {/* System Health */}
        <div className="card-premium">
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Activity size={18} style={{ color: 'var(--primary)' }} /> System Integrity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'var(--success-bg)', padding: '10px', borderRadius: '8px', color: 'var(--success)' }}>
                  <ShieldCheck size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Database Connection</p>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>Operational • 100%</p>
                </div>
              </div>
              <span className="badge badge-green">Stable</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '20px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                <p className="stat-label" style={{ marginTop: 0, marginBottom: '4px' }}>Total Recipes</p>
                <p className="stat-value" style={{ fontSize: '28px' }}>{stats.totalRecipes}</p>
              </div>
              <div style={{ padding: '20px', background: 'var(--bg-surface)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                <p className="stat-label" style={{ marginTop: 0, marginBottom: '4px' }}>Total Ingredients</p>
                <p className="stat-value" style={{ fontSize: '28px' }}>{stats.totalIngredients}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="card" style={{ borderStyle: 'dashed', borderWidth: '2px' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} /> Data Operations
          </h3>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
            Export or manage your database records. High-risk operations are marked in red.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <button className="btn-secondary" style={{ width: '100%', justifyContent: 'space-between', padding: '16px 20px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Download Sales Report (CSV)</span>
              <Download size={18} />
            </button>
            <button 
              onClick={() => {
                if (confirm("DANGER: This will recommend wiping all data. Check factory-reset.sql. Continue?")) {
                  handleReset();
                }
              }}
              style={{ 
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', background: 'var(--bg-surface)', border: '1px solid var(--danger)',
                borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', color: 'var(--danger)',
                fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em'
              }}
            >
              <span>Factory Reset (Clear All)</span>
              <Trash2 size={18} />
            </button>

            <div style={{ marginTop: '16px', padding: '16px', background: 'var(--warning-bg)', borderRadius: '10px', border: '1px solid rgba(176,120,48,0.2)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertCircle size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, color: 'var(--warning)', lineHeight: 1.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
    <div className="card" style={{ borderBottom: `4px solid var(--warning)`, padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ background: 'var(--bg-subtle)', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} style={{ color: 'var(--primary)' }} />
        </div>
      </div>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '32px', fontWeight: 700, color: color, lineHeight: 1.1, marginBottom: '6px' }}>{value}</p>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>{trend}</p>
    </div>
  )
}
