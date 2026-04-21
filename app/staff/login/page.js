'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { ChevronLeft, User, Eye, EyeOff, AlertCircle, Phone } from 'lucide-react'

export default function StaffLoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState('login') // login or signup
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginForm, setLoginForm] = useState({ mobile_number: '', password: '' })
  const [signupForm, setSignupForm] = useState({ staff_id: '', mobile_number: '', password: '', confirm_password: '' })

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (token && role === 'staff') router.replace('/staff-portal')
    fetchStaffList()
  }, [router])

  async function fetchStaffList() {
    const { data } = await supabase
      .from('staff')
      .select('id, name, designation')
      .eq('is_active', true)
      .order('name')
    setStaffList(data || [])
  }

  async function handleLogin() {
    if (!loginForm.mobile_number || !loginForm.password) {
      setError('Please enter mobile number and password')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      localStorage.setItem('cc_token', data.token)
      localStorage.setItem('cc_role', 'staff')
      localStorage.setItem('cc_staff_id', data.staff_id)
      localStorage.setItem('cc_staff_name', data.name)
      router.replace('/staff-portal')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup() {
    if (!signupForm.staff_id || !signupForm.mobile_number || !signupForm.password) {
      setError('All fields are required')
      return
    }
    if (signupForm.password !== signupForm.confirm_password) {
      setError('Passwords do not match')
      return
    }
    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/staff-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: signupForm.staff_id,
          mobile_number: signupForm.mobile_number,
          password: signupForm.password
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Signup failed')
        return
      }
      localStorage.setItem('cc_token', data.token)
      localStorage.setItem('cc_role', 'staff')
      localStorage.setItem('cc_staff_id', data.staff_id)
      localStorage.setItem('cc_staff_name', data.name)
      router.replace('/staff-portal')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'white'
    }} className="split-container">
      
      {/* LEFT PANEL */}
      <div style={{
        width: '42%',
        background: '#6B3A2A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} className="left-panel">
        <div style={{ textAlign: 'center', zIndex: 2 }}>
          <h1 style={{ fontSize: '80px', fontWeight: 800, color: '#C9943A', margin: 0, lineHeight: 1 }}>CC</h1>
          <p style={{ 
            fontSize: '28px', 
            color: 'white', 
            margin: '12px 0 0 0',
            letterSpacing: '0.3em',
            fontWeight: 300,
            textTransform: 'uppercase'
          }}>Crown Coffee</p>
          <div style={{ width: '60px', height: '1px', background: '#C9943A', margin: '24px auto' }} />
          <p style={{ 
            fontSize: '13px', 
            color: 'rgba(255,255,255,0.5)', 
            maxWidth: '240px', 
            lineHeight: '1.8',
            fontStyle: 'italic',
            margin: '0 auto'
          }}>
            "Your workspace, your records, your progress."
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{
        width: '58%',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 56px',
        position: 'relative',
        overflowY: 'auto'
      }} className="right-panel">
        
        <button 
          onClick={() => router.push('/')}
          style={{
            position: 'absolute',
            top: '40px',
            left: '56px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: '#9C8A76',
            fontSize: '13px',
            cursor: 'pointer',
            padding: 0
          }}
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div style={{ maxWidth: '420px', width: '100%', margin: '0 auto' }}>
          
          <div style={{ 
            display: 'flex', 
            background: '#F3F4F6', 
            borderRadius: '10px', 
            padding: '4px',
            marginBottom: '32px'
          }}>
            <button
              onClick={() => { setTab('login'); setError('') }}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: tab === 'login' ? 'white' : 'transparent',
                color: tab === 'login' ? '#6B3A2A' : '#9C8A76',
                boxShadow: tab === 'login' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >Sign In</button>
            <button
              onClick={() => { setTab('signup'); setError('') }}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: tab === 'signup' ? 'white' : 'transparent',
                color: tab === 'signup' ? '#6B3A2A' : '#9C8A76',
                boxShadow: tab === 'signup' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >Sign Up</button>
          </div>

          {error && (
            <div style={{ 
              background: '#FEF2F2', 
              border: '1px solid #FEE2E2', 
              borderRadius: '8px', 
              padding: '12px 14px', 
              marginBottom: '20px', 
              fontSize: '13px', 
              color: '#B91C1C',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {tab === 'login' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="custom-label">Mobile Number</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9C8A76' }}>
                    <Phone size={16} />
                  </div>
                  <input
                    className="custom-input"
                    style={{ paddingLeft: '40px' }}
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={loginForm.mobile_number}
                    onChange={e => setLoginForm({ ...loginForm, mobile_number: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                </div>
              </div>

              <div>
                <label className="custom-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="custom-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9C8A76' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                style={{
                  width: '100%',
                  height: '48px',
                  background: '#6B3A2A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s ease',
                  marginTop: '8px'
                }}
                className="signin-btn"
              >
                {loading ? 'Signing in...' : 'SIGN IN'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="custom-label">Select your name</label>
                <select
                  className="custom-input"
                  style={{ appearance: 'none', background: 'white url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E") no-repeat right 0.5rem center/1.5em 1.5em' }}
                  value={signupForm.staff_id}
                  onChange={e => setSignupForm({ ...signupForm, staff_id: e.target.value })}
                >
                  <option value="">Select name...</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.designation}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="custom-label">Mobile Number</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9C8A76' }}>
                    <Phone size={16} />
                  </div>
                  <input
                    className="custom-input"
                    style={{ paddingLeft: '40px' }}
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={signupForm.mobile_number}
                    onChange={e => setSignupForm({ ...signupForm, mobile_number: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="custom-label">Create Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="custom-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={signupForm.password}
                    onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9C8A76' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="custom-label">Confirm Password</label>
                <input
                  className="custom-input"
                  type="password"
                  placeholder="Re-enter password"
                  value={signupForm.confirm_password}
                  onChange={e => setSignupForm({ ...signupForm, confirm_password: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <button
                  onClick={handleSignup}
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '48px',
                    background: '#6B3A2A',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  className="signin-btn"
                >
                  {loading ? 'Creating account...' : 'CREATE ACCOUNT'}
                </button>
                <p style={{ marginTop: '12px', fontSize: '11px', color: '#9C8A76', textAlign: 'center', lineHeight: '1.5' }}>
                  Your account will be linked to your staff profile.<br/>
                  Contact admin if your name is not listed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .split-container { overflow: hidden; }
        .custom-label {
          display: block;
          fontSize: 11px;
          fontWeight: 600;
          color: #9C8A76;
          marginBottom: 8px;
          textTransform: uppercase;
          letterSpacing: 0.08em;
        }
        .custom-input {
          width: 100%;
          padding: 11px 14px;
          fontSize: 14px;
          border: 1px solid #E8E0D4;
          border-radius: 8px;
          outline: none;
          transition: all 0.2s ease;
          background: #FFFFFF;
          color: #1C1410;
        }
        .custom-input:focus {
          border-color: #6B3A2A;
          box-shadow: 0 0 0 3px rgba(107,58,42,0.08);
        }
        .signin-btn:hover {
          background: #5A3022 !important;
        }
        @media (max-width: 768px) {
          .split-container { flex-direction: column !important; }
          .left-panel { width: 100% !important; height: 180px !important; padding: 32px !important; }
          .left-panel h1 { fontSize: 48px !important; }
          .left-panel p:nth-child(2) { fontSize: 18px !important; }
          .left-panel p:nth-child(4) { display: none; }
          .right-panel { width: 100% !important; padding: 48px 24px !important; flex: 1; }
          .right-panel button:first-child { top: 20px; left: 24px; }
        }
      `}</style>
    </div>
  )
}
