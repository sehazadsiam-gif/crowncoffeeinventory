'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { 
  TrendingUp, Package, Trash2, LogOut, ShieldCheck, 
  Activity, FileText, AlertCircle, Database, Users, 
  Coffee, ShoppingCart, Receipt, Eraser, AlertTriangle,
  MessageSquare, Star
} from 'lucide-react'

export default function AdminClient({ initialStats }) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(null) // table name or 'all'
  const [feedbacks, setFeedbacks] = useState([])
  const [feedbacksLoading, setFeedbacksLoading] = useState(false)
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    const auth = localStorage.getItem('isAdmin')
    if (auth === 'true') {
      setIsAuthorized(true)
      // Check query parameter for default active tab
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const tab = params.get('tab')
        if (tab) {
          setActiveTab(tab)
        }
      }
    } else {
      router.push('/login')
    }
  }, [router])

  const fetchFeedbacks = async () => {
    setFeedbacksLoading(true)
    try {
      const res = await fetch('/api/guest-feedbacks')
      const data = await res.json()
      if (res.ok && data.success) {
        setFeedbacks(data.data)
      } else {
        throw new Error(data.error || 'Failed to load feedbacks')
      }
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setFeedbacksLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'feedbacks') {
      fetchFeedbacks()
    }
  }, [activeTab])

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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="https://crowncoffeejobs.vercel.app/admin" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '10px 20px', fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} /> Jobs Admin
          </a>
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
        <div onClick={() => setActiveTab('feedbacks')} style={tabStyle('feedbacks')}><MessageSquare size={16} /> Guest Feedbacks</div>
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
          <div className="card-premium" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', color: 'white', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.15)', padding: '10px', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
                    <AlertCircle size={24} color="white" />
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'white' }}>Staff Inbox</h3>
                </div>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', margin: 0 }}>
                  View and reply to requisitions, leave requests, and messages sent by staff members.
                </p>
              </div>
              <button
                onClick={() => router.push('/admin/queries')}
                style={{ background: 'white', color: '#2563eb', padding: '12px 28px', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
              >
                Open Staff Inbox →
              </button>
            </div>
          </div>

          <div className="card-premium">
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>System Management</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
              Navigate to system directories, configure options, and review telemetry.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div 
                onClick={() => router.push('/staff')}
                style={{
                  padding: '24px', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)',
                  borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '12px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
              >
                <div style={{ color: 'var(--accent-blue)', background: 'var(--accent-blue-dim)', padding: '10px', borderRadius: '8px', width: 'fit-content' }}>
                  <Users size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Staff Directory</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Manage staff payroll and roles.</p>
                </div>
              </div>

              <div 
                onClick={() => router.push('/menu')}
                style={{
                  padding: '24px', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)',
                  borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '12px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
              >
                <div style={{ color: 'var(--accent-gold)', background: 'var(--accent-gold-dim)', padding: '10px', borderRadius: '8px', width: 'fit-content' }}>
                  <Coffee size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Manage Menu</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Update menu items and recipes.</p>
                </div>
              </div>

              <div 
                onClick={() => router.push('/stock')}
                style={{
                  padding: '24px', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)',
                  borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '12px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--success)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
              >
                <div style={{ color: 'var(--success)', background: 'var(--success-bg)', padding: '10px', borderRadius: '8px', width: 'fit-content' }}>
                  <Package size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Inventory Control</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Track raw stocks and movements.</p>
                </div>
              </div>

              <div 
                onClick={() => router.push('/portal')}
                style={{
                  padding: '24px', background: 'var(--bg-subtle)', border: '1px solid var(--border-light)',
                  borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '12px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
              >
                <div style={{ color: 'var(--accent-blue)', background: 'var(--accent-blue-dim)', padding: '10px', borderRadius: '8px', width: 'fit-content' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Staff Portal View</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Access the portal dashboard view.</p>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('feedbacks')}
                style={{
                  padding: '24px', background: 'var(--accent-brown-dim)', border: '1px solid var(--accent-brown-glow)',
                  borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '12px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--accent-brown)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--accent-brown-glow)'; }}
              >
                <div style={{ color: 'var(--accent-brown)', background: 'var(--accent-brown-glow)', padding: '10px', borderRadius: '8px', width: 'fit-content' }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--accent-brown)' }}>Guest Feedbacks</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>View customer reviews & ratings.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Guest Feedbacks */}
      {activeTab === 'feedbacks' && (
        <div className="animate-in" style={{ display: 'grid', gap: '24px' }}>
          <div className="card-premium">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <MessageSquare size={18} style={{ color: 'var(--accent-brown)' }} /> Guest Feedbacks
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px', margin: 0 }}>
                  Customer reviews, ratings, and feedback collected from ccadmin.online/guest-feedbacks
                </p>
              </div>
              <button 
                onClick={fetchFeedbacks} 
                className="btn-secondary" 
                style={{ padding: '8px 16px', fontSize: '12px' }}
                disabled={feedbacksLoading}
              >
                Refresh List
              </button>
            </div>

            {feedbacksLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <div className="loader" />
              </div>
            ) : feedbacks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-subtle)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ fontSize: '14px', margin: 0 }}>No feedbacks received yet.</p>
              </div>
            ) : (
              <>
                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Feedbacks</p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{feedbacks.length}</p>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Rating</p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: 800, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      {(feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)} <Star size={20} fill="var(--accent-gold)" stroke="var(--accent-gold)" />
                    </p>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Positive Reviews (4-5★)</p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: 800, color: 'var(--success)' }}>
                      {Math.round((feedbacks.filter(f => f.rating >= 4).length / feedbacks.length) * 100)}%
                    </p>
                  </div>
                </div>

                {/* Feedbacks Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  {feedbacks.map((fb) => (
                    <div 
                      key={fb.id} 
                      style={{ 
                        padding: '24px', 
                        background: 'var(--bg-surface)', 
                        borderRadius: '12px', 
                        border: '1px solid var(--border-light)',
                        display: 'grid',
                        gap: '16px',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '3px' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                              key={s} 
                              size={16} 
                              fill={s <= fb.rating ? 'var(--accent-gold)' : 'none'} 
                              stroke={s <= fb.rating ? 'var(--accent-gold)' : 'var(--text-faint)'} 
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {new Date(fb.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          Phone: {fb.phone}
                        </span>
                        {fb.highlights && fb.highlights.length > 0 && fb.highlights.map((h) => (
                          <span 
                            key={h} 
                            style={{ 
                              fontSize: '11px', 
                              padding: '4px 10px', 
                              borderRadius: '999px', 
                              background: 'var(--accent-brown-dim)', 
                              color: 'var(--accent-brown)', 
                              fontWeight: 600,
                              textTransform: 'capitalize' 
                            }}
                          >
                            {h.replace('_', ' ')}
                          </span>
                        ))}
                      </div>

                      {fb.suggestion ? (
                        <p style={{ 
                          margin: 0, 
                          fontSize: '13px', 
                          color: 'var(--text-secondary)', 
                          background: 'var(--bg-subtle)', 
                          padding: '12px 16px', 
                          borderRadius: '8px', 
                          borderLeft: '3px solid var(--accent-brown)',
                          lineHeight: 1.5
                        }}>
                          {fb.suggestion}
                        </p>
                      ) : (
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                          No comments left.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
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
