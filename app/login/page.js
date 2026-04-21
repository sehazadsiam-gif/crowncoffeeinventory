'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import Navbar from '../../components/Navbar'
import { 
  Lock, User, LogIn, Coffee, Users, 
  ArrowRight, ShieldCheck, Phone, UserPlus, 
  ArrowLeft as ArrowLeftIcon, Key
} from 'lucide-react'

export default function GatewayPage() {
  const [activeMode, setActiveMode] = useState('choice') // 'choice', 'admin', 'staff'
  const [staffSubMode, setStaffSubMode] = useState('login') // 'login', 'signup'
  
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  
  const [staffList, setStaffList] = useState([])
  const [signupForm, setSignupForm] = useState({ staffId: '', mobile: '', password: '' })
  const [staffLoginForm, setStaffLoginForm] = useState({ mobile: '', password: '' })
  
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    if (activeMode === 'staff' && staffSubMode === 'signup') {
      fetchUnclaimedStaff()
    }
  }, [activeMode, staffSubMode])

  async function fetchUnclaimedStaff() {
    setLoading(true)
    // We fetch staff who haven't set a password yet
    const { data } = await supabase.from('staff')
      .select('id, name')
      .eq('is_active', true)
      .is('password', null) 
      .order('name')
    setStaffList(data || [])
    setLoading(false)
  }

  const handleAdminLogin = (e) => {
    e.preventDefault()
    setLoading(true)
    if (username === 'admin' && password === 'admin12345') {
      localStorage.setItem('isAdmin', 'true')
      addToast('Welcome back, Admin!', 'success')
      router.push('/')
    } else {
      addToast('Invalid credentials', 'error')
    }
    setLoading(false)
  }

  const handleStaffSignup = async (e) => {
    e.preventDefault()
    if (!signupForm.staffId || !signupForm.mobile || !signupForm.password) {
      return addToast('Please fill all fields', 'error')
    }
    setLoading(true)
    try {
      const { error } = await supabase.from('staff')
        .update({ 
          mobile: signupForm.mobile, 
          password: signupForm.password // In production, hash this!
        })
        .eq('id', signupForm.staffId)
      
      if (error) throw error
      addToast('Signup successful! You can now login.', 'success')
      setStaffSubMode('login')
    } catch (err) {
      addToast('Signup failed: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleStaffLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase.from('staff')
        .select('id, name')
        .eq('mobile', staffLoginForm.mobile)
        .eq('password', staffLoginForm.password)
        .eq('is_active', true)
        .single()
      
      if (error || !data) throw new Error('Invalid mobile or password')
      
      localStorage.setItem('staffPortalId', data.id)
      addToast(`Welcome, ${data.name}!`, 'success')
      router.push('/portal/dashboard')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
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
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Staff & Management Portal</p>
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
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Staff Member</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Login or Signup to view your personal payments, attendance, and records.
              </p>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: 600, fontSize: '14px' }}>
                Enter Staff Portal <ArrowRight size={16} />
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
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Admin / Manager</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Secure access for system administration and management oversight.
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
              <ArrowLeftIcon size={14} /> Back
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
              <ArrowLeftIcon size={14} /> Back
            </button>
            
            <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-light)', marginBottom: '24px' }}>
              <button 
                onClick={() => setStaffSubMode('login')}
                style={{ 
                  flex: 1, padding: '12px', background: 'none', border: 'none', 
                  borderBottom: staffSubMode === 'login' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  color: staffSubMode === 'login' ? 'var(--accent-blue)' : 'var(--text-muted)',
                  fontWeight: 700, cursor: 'pointer'
                }}
              >Login</button>
              <button 
                onClick={() => setStaffSubMode('signup')}
                style={{ 
                  flex: 1, padding: '12px', background: 'none', border: 'none', 
                  borderBottom: staffSubMode === 'signup' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  color: staffSubMode === 'signup' ? 'var(--accent-blue)' : 'var(--text-muted)',
                  fontWeight: 700, cursor: 'pointer'
                }}
              >Signup</button>
            </div>

            {staffSubMode === 'login' ? (
              <form onSubmit={handleStaffLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="label">Mobile Number</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input" placeholder="01XXX XXXXXX" style={{ paddingLeft: '40px' }} value={staffLoginForm.mobile} onChange={e => setStaffLoginForm({...staffLoginForm, mobile: e.target.value})} required />
                    <Phone size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  </div>
                </div>
                <div>
                  <label className="label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input" type="password" placeholder="••••••••" style={{ paddingLeft: '40px' }} value={staffLoginForm.password} onChange={e => setStaffLoginForm({...staffLoginForm, password: e.target.value})} required />
                    <Key size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  </div>
                </div>
                <button className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
                  {loading ? 'Authenticating...' : 'Enter Portal'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleStaffSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="label">Find Your Name</label>
                  <select className="input" value={signupForm.staffId} onChange={e => setSignupForm({...signupForm, staffId: e.target.value})} required>
                    <option value="">Choose name...</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Set Mobile Number</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input" placeholder="01XXX XXXXXX" style={{ paddingLeft: '40px' }} value={signupForm.mobile} onChange={e => setSignupForm({...signupForm, mobile: e.target.value})} required />
                    <Phone size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  </div>
                </div>
                <div>
                  <label className="label">Create Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input" type="password" placeholder="Choose a unique password" style={{ paddingLeft: '40px' }} value={signupForm.password} onChange={e => setSignupForm({...signupForm, password: e.target.value})} required />
                    <Key size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  </div>
                </div>
                <button className="btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Complete Signup'}
                </button>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Note: You must already be in the Staff Directory to signup.
                </p>
              </form>
            )}
          </div>
        )}
      </main>

      <div style={{ textAlign: 'center', paddingBottom: '40px', color: 'var(--text-muted)', fontSize: '12px' }}>
        <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> 
        Crown Coffee Information System v2.0
      </div>
    </div>
  )
}
