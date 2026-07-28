'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import {
  Lock, User, Coffee, Users,
  ArrowRight, ShieldCheck, Phone, ArrowLeft,
  Key, Eye, EyeOff, Sparkles, Star
} from 'lucide-react'

export default function GatewayPage() {
  const [activeMode, setActiveMode] = useState('choice')
  const [staffSubMode, setStaffSubMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [adminPin, setAdminPin] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [staffList, setStaffList] = useState([])
  const [signupForm, setSignupForm] = useState({ staffId: '', mobile: '', password: '' })
  const [staffLoginForm, setStaffLoginForm] = useState({ mobile: '', password: '' })
  const [mounted, setMounted] = useState(false)

  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    setMounted(true)
    const isAdmin = localStorage.getItem('isAdmin')
    if (isAdmin === 'true') router.push('/')
  }, [router])

  useEffect(() => {
    if (activeMode === 'staff' && staffSubMode === 'signup') fetchUnclaimedStaff()
  }, [activeMode, staffSubMode])

  async function fetchUnclaimedStaff() {
    setLoading(true)
    const { data } = await supabase.from('staff').select('id, name').eq('is_active', true).is('password', null).order('name')
    setStaffList(data || [])
    setLoading(false)
  }

  const handleAdminLogin = (e) => {
    e.preventDefault()
    setLoading(true)
    if (adminPin.trim() === '1590' || (username === 'admin' && password === 'admin12345')) {
      localStorage.setItem('isAdmin', 'true')
      localStorage.setItem('cc_token', 'admin_pin_session')
      localStorage.setItem('cc_role', 'admin')
      addToast('Welcome back, Admin!', 'success')
      router.push('/')
    } else {
      addToast('Invalid Admin PIN', 'error')
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
      const { error } = await supabase.from('staff').update({ mobile: signupForm.mobile, password: signupForm.password }).eq('id', signupForm.staffId)
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
      const { data, error } = await supabase.from('staff').select('id, name').eq('mobile', staffLoginForm.mobile).eq('password', staffLoginForm.password).eq('is_active', true).single()
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
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>

      {/* Subtle decorative gradient backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(37,99,235,0.07), transparent)',
      }} />

      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto', padding: '40px 20px 60px' }}>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px', opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '72px', height: '72px', borderRadius: '22px', marginBottom: '20px',
            background: 'linear-gradient(135deg, #7C3A1E 0%, #D4933A 100%)',
            boxShadow: '0 8px 28px rgba(124,58,30,0.32)',
          }}>
            <Coffee size={34} color="white" />
          </div>
          <h1 style={{ fontSize: '34px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.04em', margin: '0 0 8px' }}>Crown Coffee</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', margin: 0, fontWeight: 500 }}>Staff &amp; Management Portal</p>
          {activeMode === 'choice' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--accent-blue-dim)', border: '1px solid var(--border-accent)', borderRadius: '20px', padding: '5px 14px', marginTop: '14px' }}>
              <Sparkles size={12} style={{ color: 'var(--accent-blue)' }} />
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--accent-blue)', letterSpacing: '0.05em' }}>SELECT YOUR PORTAL</span>
            </div>
          )}
        </div>

        {/* ── CHOICE MODE ── */}
        {activeMode === 'choice' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }} className="animate-in">

            {/* Staff Card */}
            <div
              onClick={() => setActiveMode('staff')}
              style={{
                background: 'var(--bg-surface)', border: '1.5px solid var(--border-light)',
                borderRadius: '22px', padding: '40px 32px', cursor: 'pointer', textAlign: 'center',
                boxShadow: 'var(--shadow-sm)', transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-brown)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow-brown)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
            >
              <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(124,58,30,0.07)', pointerEvents: 'none' }} />
              <div style={{
                background: 'linear-gradient(135deg, rgba(124,58,30,0.12), rgba(212,147,58,0.10))',
                border: '1.5px solid rgba(124,58,30,0.15)',
                width: '64px', height: '64px', borderRadius: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px',
                color: 'var(--accent-brown)'
              }}>
                <Users size={28} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px', letterSpacing: '-0.02em' }}>Staff Member</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px', lineHeight: 1.6 }}>
                Login or signup to view your salary, attendance, leave balance, and more.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-brown)', fontWeight: 700, fontSize: '14px' }}>
                Enter Staff Portal <ArrowRight size={16} />
              </div>
            </div>

            {/* Admin Card */}
            <div
              onClick={() => setActiveMode('admin')}
              style={{
                background: 'var(--bg-surface)', border: '1.5px solid var(--border-light)',
                borderRadius: '22px', padding: '40px 32px', cursor: 'pointer', textAlign: 'center',
                boxShadow: 'var(--shadow-sm)', transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow-blue)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
            >
              <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(37,99,235,0.05)', pointerEvents: 'none' }} />
              <div style={{
                background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(96,165,250,0.08))',
                border: '1.5px solid rgba(37,99,235,0.15)',
                width: '64px', height: '64px', borderRadius: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px',
                color: 'var(--accent-blue)'
              }}>
                <ShieldCheck size={28} />
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px', letterSpacing: '-0.02em' }}>Admin / Manager</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px', lineHeight: 1.6 }}>
                Secure access to admin dashboard, payroll, reports, and system management.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: 700, fontSize: '14px' }}>
                Management Sign In <ArrowRight size={16} />
              </div>
            </div>
          </div>
        )}

        {/* ── ADMIN LOGIN MODE ── */}
        {activeMode === 'admin' && (
          <div style={{ maxWidth: '420px', margin: '0 auto' }} className="animate-in">
            <button onClick={() => setActiveMode('choice')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', marginBottom: '24px', fontFamily: 'var(--font-sans)', fontWeight: 600, padding: '0' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <ArrowLeft size={15} /> Back
            </button>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '22px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={22} color="rgba(255,255,255,0.85)" />
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'white', margin: 0 }}>Admin Sign In</h2>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: '5px 0 0' }}>Authorized personnel only</p>
              </div>

              <div style={{ padding: '28px' }}>
                <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="label">Admin Security PIN</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
                      <input 
                        className="input" 
                        type="password" 
                        style={{ paddingLeft: '42px', fontSize: '18px', letterSpacing: '4px', textAlign: 'center' }} 
                        placeholder="Enter Admin PIN" 
                        value={adminPin} 
                        onChange={e => setAdminPin(e.target.value)} 
                        required 
                        autoFocus
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%', height: '48px', marginTop: '4px' }} disabled={loading}>
                    {loading ? 'Verifying PIN...' : 'Access Admin Dashboard →'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── STAFF LOGIN/SIGNUP MODE ── */}
        {activeMode === 'staff' && (
          <div style={{ maxWidth: '420px', margin: '0 auto' }} className="animate-in">
            <button onClick={() => setActiveMode('choice')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', marginBottom: '24px', fontFamily: 'var(--font-sans)', fontWeight: 600, padding: '0' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <ArrowLeft size={15} /> Back
            </button>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '22px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>

              {/* Tab switcher */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-subtle)' }}>
                {[{ id: 'login', label: 'Login' }, { id: 'signup', label: 'First-time Signup' }].map(tab => (
                  <button key={tab.id} onClick={() => setStaffSubMode(tab.id)} style={{
                    flex: 1, padding: '14px 16px', background: 'none', border: 'none',
                    borderBottom: staffSubMode === tab.id ? '2px solid var(--accent-brown)' : '2px solid transparent',
                    color: staffSubMode === tab.id ? 'var(--accent-brown)' : 'var(--text-muted)',
                    fontWeight: 700, cursor: 'pointer', fontSize: '13.5px',
                    fontFamily: 'var(--font-sans)', transition: 'all 0.2s'
                  }}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: '28px' }}>
                {staffSubMode === 'login' ? (
                  <form onSubmit={handleStaffLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label className="label">Mobile Number</label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
                        <input className="input" placeholder="01XXX XXXXXX" style={{ paddingLeft: '42px' }} value={staffLoginForm.mobile} onChange={e => setStaffLoginForm({ ...staffLoginForm, mobile: e.target.value })} required />
                      </div>
                    </div>
                    <div>
                      <label className="label">Password</label>
                      <div style={{ position: 'relative' }}>
                        <Key size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
                        <input className="input" type="password" placeholder="••••••••" style={{ paddingLeft: '42px' }} value={staffLoginForm.password} onChange={e => setStaffLoginForm({ ...staffLoginForm, password: e.target.value })} required />
                      </div>
                    </div>
                    <button type="submit" disabled={loading} style={{
                      width: '100%', height: '48px', borderRadius: '12px', border: 'none',
                      background: loading ? 'var(--border-medium)' : 'linear-gradient(135deg, #6B3A2A, #A05228)',
                      color: 'white', fontWeight: 700, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s', fontFamily: 'var(--font-sans)', marginTop: '4px',
                      boxShadow: loading ? 'none' : 'var(--shadow-glow-brown)'
                    }}>
                      {loading ? 'Authenticating...' : 'Enter Portal →'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleStaffSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label className="label">Find Your Name</label>
                      <select className="input" value={signupForm.staffId} onChange={e => setSignupForm({ ...signupForm, staffId: e.target.value })} required>
                        <option value="">Choose your name...</option>
                        {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Set Mobile Number</label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
                        <input className="input" placeholder="01XXX XXXXXX" style={{ paddingLeft: '42px' }} value={signupForm.mobile} onChange={e => setSignupForm({ ...signupForm, mobile: e.target.value })} required />
                      </div>
                    </div>
                    <div>
                      <label className="label">Create Password</label>
                      <div style={{ position: 'relative' }}>
                        <Key size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
                        <input className="input" type="password" placeholder="Choose a strong password" style={{ paddingLeft: '42px' }} value={signupForm.password} onChange={e => setSignupForm({ ...signupForm, password: e.target.value })} required />
                      </div>
                    </div>
                    <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '11px 14px', fontSize: '12.5px', color: 'var(--warning)', lineHeight: 1.55 }}>
                      ⚠️ You must already be listed in the Staff Directory to create an account.
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', height: '48px' }}>
                      {loading ? 'Creating Account...' : 'Complete Signup →'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '48px', opacity: 0.55 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <ShieldCheck size={13} />
            Crown Coffee Information System v2.0
          </div>
        </div>
      </main>
    </div>
  )
}
