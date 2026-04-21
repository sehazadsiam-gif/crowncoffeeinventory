'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { 
  TrendingUp, Package, Trash2, LogOut, ShieldCheck, 
  Activity, FileText, AlertCircle, Database, Users, 
  Coffee, ShoppingCart, Receipt, Eraser, AlertTriangle
} from 'lucide-react'

export default function AdminClient({ initialStats }) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(null) // table name or 'all'
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

  const clearTable = async (tableName) => {
    if (confirmText !== 'CLEAR') {
      addToast('Please type CLEAR to confirm', 'error')
      return
    }

    setLoading(true)
    try {
      // For Supabase, the easiest way to "wipe" without TRUNCATE privilege 
      // is to delete all rows. Using a condition that is always true.
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Assuming UUID or non-zero ID

      if (error) throw error
      
      addToast(`Table ${tableName} cleared successfully`, 'success')
      setShowConfirmModal(null)
      setConfirmText('')
    } catch (err) {
      addToast(`Error clearing ${tableName}: ` + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const wipeAllData = async () => {
    if (confirmText !== 'WIPE ALL DATA') {
      addToast('Please type "WIPE ALL DATA" to confirm', 'error')
      return
    }

    setLoading(true)
    const tables = ['sales', 'bazar', 'waste', 'attendance', 'payroll_entries', 'advance_log', 'salary_payments', 'ingredients', 'recipes']
    
    try {
      for (const table of tables) {
        await supabase.from(table).delete().neq('id', 0)
      }
      addToast('System reset complete. All transaction data cleared.', 'success')
      setShowConfirmModal(null)
      setConfirmText('')
    } catch (err) {
      addToast('Error during system wipe: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
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

  const tabStyle = (id) => ({
    padding: '12px 20px',
    cursor: 'pointer',
    borderBottom: activeTab === id ? '2px solid var(--accent-blue)' : '2px solid transparent',
    color: activeTab === id ? 'var(--accent-blue)' : 'var(--text-muted)',
    fontWeight: activeTab === id ? 700 : 500,
    fontSize: '14px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  })

  return (
    <div className="animate-in" style={{ display: 'grid', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldCheck size={28} style={{ color: 'var(--accent-blue)' }} strokeWidth={1.5} /> 
            Super Admin Control
          </h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            System-wide management, data operations, and security overrides.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => window.print()} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '11px' }}>
            <FileText size={14} /> System Report
          </button>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '11px', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', overflowX: 'auto' }}>
        <div onClick={() => setActiveTab('overview')} style={tabStyle('overview')}><Activity size={16} /> Overview</div>
        <div onClick={() => setActiveTab('db')} style={tabStyle('db')}><Database size={16} /> Database Manager</div>
        <div onClick={() => setActiveTab('entities')} style={tabStyle('entities')}><Users size={16} /> Management</div>
      </div>

      {/* Tab Content: Overview */}
      {activeTab === 'overview' && (
        <div className="animate-in" style={{ display: 'grid', gap: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            <AdminStatCard label="Lifetime Revenue" value={`৳${stats.totalRevenue.toLocaleString()}`} icon={TrendingUp} trend="System-wide aggregation" color="var(--success)" />
            <AdminStatCard label="Inventory Asset Value" value={`৳${stats.inventoryValue.toLocaleString()}`} icon={Package} trend="Live valuation" color="var(--warning)" />
            <AdminStatCard label="Active Recipes" value={stats.totalRecipes} icon={Coffee} trend="Menu complexity" color="var(--primary)" />
          </div>

          <div className="card-premium">
            <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={18} /> System Diagnostics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <p className="stat-label">Ingredients</p>
                <p className="stat-value" style={{ fontSize: '24px' }}>{stats.totalIngredients}</p>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <p className="stat-label">Sales Entries</p>
                <p className="stat-value" style={{ fontSize: '24px' }}>{stats.totalSalesCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Database Manager (The Powerful Part) */}
      {activeTab === 'db' && (
        <div className="animate-in" style={{ display: 'grid', gap: '24px' }}>
          <div className="instruction-box" style={{ background: '#FFF5F5', borderLeftColor: 'var(--danger)' }}>
            <p style={{ color: 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} /> DANGER ZONE
            </p>
            <p style={{ marginTop: '8px' }}>
              The operations below are destructive. Clearing a table will remove all its records permanently.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
            {/* Table Clearing Cards */}
            <DbOperationCard 
              title="Clear Sales & Orders" 
              desc="Delete all lifetime sales records. Does not affect menu or inventory." 
              onClear={() => setShowConfirmModal('sales')}
              icon={Receipt}
            />
            <DbOperationCard 
              title="Clear Bazar/Expense" 
              desc="Wipe all purchase history and expense logs from bazar entries." 
              onClear={() => setShowConfirmModal('bazar')}
              icon={ShoppingCart}
            />
            <DbOperationCard 
              title="Clear Attendance & Payroll" 
              desc="Remove all history for attendance, payroll, and salary payments." 
              onClear={() => setShowConfirmModal('attendance')}
              icon={Users}
            />
            <DbOperationCard 
              title="Full Factory Reset" 
              desc="Wipe everything except staff list and menu structure. Complete clean slate." 
              onClear={() => setShowConfirmModal('all')}
              icon={Eraser}
              danger
            />
          </div>
        </div>
      )}

      {/* Tab Content: Management */}
      {activeTab === 'entities' && (
        <div className="animate-in" style={{ display: 'grid', gap: '24px' }}>
          <div className="card-premium">
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Manage Project Access</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Add or remove core system entities. Use specific pages for detailed management.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
               <button onClick={() => router.push('/staff')} className="btn-primary"><Users size={16} /> Go to Staff Directory</button>
               <button onClick={() => router.push('/menu')} className="btn-secondary"><Coffee size={16} /> Manage Menu</button>
               <button onClick={() => router.push('/stock')} className="btn-secondary"><Package size={16} /> Inventory Control</button>
               <button onClick={() => router.push('/portal')} className="btn-secondary"><FileText size={16} /> Staff Portal View</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-in" style={{ maxWidth: '450px', width: '100%', background: 'white', padding: '32px' }}>
            <div style={{ color: 'var(--danger)', marginBottom: '20px', textAlign: 'center' }}>
              <AlertTriangle size={48} style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 700 }}>Destructive Action</h3>
            </div>
            
            <p style={{ fontSize: '14px', color: '#555', textAlign: 'center', marginBottom: '24px', lineHeight: 1.5 }}>
              You are about to clear <strong>{showConfirmModal === 'all' ? 'THE ENTIRE SYSTEM' : `the ${showConfirmModal} table`}</strong>. 
              This cannot be undone.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Type <strong>{showConfirmModal === 'all' ? 'WIPE ALL DATA' : 'CLEAR'}</strong> to confirm
              </label>
              <input 
                className="input"
                placeholder="Type here..."
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                style={{ borderColor: confirmText === (showConfirmModal === 'all' ? 'WIPE ALL DATA' : 'CLEAR') ? 'var(--success)' : 'var(--border-medium)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => { setShowConfirmModal(null); setConfirmText(''); }}
                className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button 
                disabled={loading || confirmText !== (showConfirmModal === 'all' ? 'WIPE ALL DATA' : 'CLEAR')}
                onClick={() => showConfirmModal === 'all' ? wipeAllData() : clearTable(showConfirmModal)}
                className="btn-primary" 
                style={{ flex: 1, background: 'var(--danger)', color: 'white' }}>
                {loading ? 'Processing...' : 'Confirm Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminStatCard({ label, value, icon: Icon, trend, color }) {
  return (
    <div className="card" style={{ borderBottom: `4px solid var(--border-light)`, padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}>
        <Icon size={100} />
      </div>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '32px', fontWeight: 700, color: color, lineHeight: 1.1, marginBottom: '6px' }}>{value}</p>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>{trend}</p>
    </div>
  )
}

function DbOperationCard({ title, desc, onClear, icon: Icon, danger }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: danger ? '1px solid #FFDADA' : '1px solid var(--border-light)', background: danger ? '#FFF9F9' : 'white' }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ 
          background: 'rgba(37,99,235,0.08)', 
          padding: '12px', borderRadius: '10px', color: danger ? 'var(--danger)' : 'var(--accent-blue)' 
        }}>
          <Icon size={24} />
        </div>
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: danger ? 'var(--danger)' : 'var(--text-primary)' }}>{title}</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>{desc}</p>
        </div>
      </div>
      <button 
        onClick={onClear}
        className="btn-secondary" 
        style={{ 
          marginTop: 'auto', width: '100%', color: danger ? 'white' : 'var(--danger)', 
          background: danger ? 'var(--danger)' : 'transparent', 
          borderColor: 'var(--danger)', fontSize: '12px', fontWeight: 600 
        }}>
        {danger ? <Eraser size={14} /> : <Trash2 size={14} />} Clear This Data
      </button>
    </div>
  )
}
