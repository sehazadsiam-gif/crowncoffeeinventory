'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import Navbar from '../../components/Navbar'
import { 
  Lock, User, LogIn, Coffee, Users, 
  ArrowRight, ShieldCheck, CreditCard, Clock
} from 'lucide-react'

export default function GatewayPage() {
  const [activeMode, setActiveMode] = useState('choice') // 'choice', 'admin', 'staff'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [staffList, setStaffList] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    if (activeMode === 'staff') {
      fetchStaff()
    }
  }, [activeMode])

  async function fetchStaff() {
    setLoading(true)
    const { data } = await supabase.from('staff').select('id, name').eq('is_active', true).order('name')
    setStaffList(data || [])
    setLoading(false)
  }

  const handleAdminLogin = (e) => {
    e.preventDefault()
    setLoading(true)
    if (username === 'admin' && password === 'admin12345') {
      localStorage.setItem('isAdmin', 'true')
      addToast('Welcome back, Admin!', 'success')
      router.push('/admin')
    } else {
      addToast('Invalid credentials', 'error')
    }
    setLoading(false)
  }

  const handleStaffLogin = () => {
    if (!selectedStaffId) return addToast('Please select your name', 'error')
    localStorage.setItem('staffPortalId', selectedStaffId)
    addToast('Welcome to your portal', 'success')
    router.push('/portal/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navbar />
      
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ 
            background: 'var(--accent-blue)', width: '64px', height: '64px', 
            borderRadius: '16px', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', margin: '0 auto 20px', color: 'white',
            boxShadow: 'var(--shadow-md)'
          }}>
            <Coffee size={32} />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>Crown Coffee</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Management & Staff Information System</p>
        </div>

        {activeMode === 'choice' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }} className="animate-in">
            {/* Staff Card */}
            <div 
              onClick={() => setActiveMode('staff')}
              className="card-premium" 
              style={{ padding: '40px', cursor: 'pointer', textAlign: 'center', border: '1px solid var(--border-light)', transition: 'all 0.2s ease' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
            >
              <div style={{ background: 'rgba(37,99,235,0.08)', color: 'var(--accent-blue)', width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Users size={28} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Staff Portal</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                View your progress, payments, attendance, and account breakdown.
              </p>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: 600, fontSize: '14px' }}>
                Access My Records <ArrowRight size={16} />
              </span>
            </div>

            {/* Admin Card */}
            <div 
              onClick={() => setActiveMode('admin')}
              className="card-premium" 
              style={{ padding: '40px', cursor: 'pointer', textAlign: 'center', border: '1px solid var(--border-light)', transition: 'all 0.2s ease' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
            >
              <div style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)', width: '56px', height: '56px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <ShieldCheck size={28} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Admin Access</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Inventory management, staff records, sales logs, and system reports.
              </p>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>
                Management Sign In <ArrowRight size={16} />
              </span>
            </div>
          </div>
        )}

        {activeMode === 'admin' && (
          <div className="card animate-in" style={{ maxWidth: '400px', margin: '0 auto', padding: '40px' }}>
            <button onClick={() => setActiveMode('choice')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer', marginBottom: '24px' }}>
              <ArrowLeft size={14} /> Back to selection
            </button>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>Admin Sign In</h2>
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label">Username</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" style={{ paddingLeft: '40px' }} value={username} onChange={e => setUsername(e.target.value)} required />
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                </div>
              </div>
              <div>
                <label className="label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" type="password" style={{ paddingLeft: '40px' }} value={password} onChange={e => setPassword(e.target.value)} required />
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                </div>
              </div>
              <button className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </div>
        )}

        {activeMode === 'staff' && (
          <div className="card animate-in" style={{ maxWidth: '400px', margin: '0 auto', padding: '40px' }}>
            <button onClick={() => setActiveMode('choice')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer', marginBottom: '24px' }}>
              <ArrowLeft size={14} /> Back to selection
            </button>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>Staff Portal</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>Select your name to access your file.</p>
            
            <div style={{ marginBottom: '24px' }}>
              <label className="label">Your Name</label>
              <select className="input" value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)}>
                <option value="">Choose your name...</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button onClick={handleStaffLogin} className="btn-primary" style={{ width: '100%', padding: '12px' }}>
              Enter My Portal
            </button>
          </div>
        )}

      </main>
    </div>
  )
}

function ArrowLeft({ size }) {
  return <ArrowRight size={size} style={{ transform: 'rotate(180deg)' }} />
}
