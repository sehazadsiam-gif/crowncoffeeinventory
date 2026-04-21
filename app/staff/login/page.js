'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { Coffee, User, Eye, EyeOff } from 'lucide-react'

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
      minHeight: '100vh', background: '#FAF7F2',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ background: '#8B5E3C', padding: '8px', borderRadius: '10px' }}>
              <Coffee size={22} color="white" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1C1410', margin: 0 }}>Crown Coffee</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
            <User size={16} color="#8B5E3C" />
            <p style={{ color: '#8B5E3C', fontSize: '14px', fontWeight: 600, margin: 0 }}>Staff Portal</p>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 24px rgba(28,20,16,0.08)', border: '1px solid #E8E0D4' }}>

          <div style={{ display: 'flex', gap: '0', marginBottom: '24px', background: '#F5F0E8', borderRadius: '8px', padding: '4px' }}>
            {['login', 'signup'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                style={{
                  flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600,
                  borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: tab === t ? 'white' : 'transparent',
                  color: tab === t ? '#8B5E3C' : '#9C8A76',
                  boxShadow: tab === t ? '0 1px 4px rgba(28,20,16,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                  textTransform: 'capitalize'
                }}
              >
                {t === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background: '#fce8e6', border: '1px solid #d93025', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#d93025' }}>
              {error}
            </div>
          )}

          {tab === 'login' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5C4A36', marginBottom: '6px' }}>
                  Mobile Number
                </label>
                <input
                  className="input"
                  type="tel"
                  placeholder="e.g. 01712345678"
                  value={loginForm.mobile_number}
                  onChange={e => setLoginForm({ ...loginForm, mobile_number: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5C4A36', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    style={{ paddingRight: '44px' }}
                  />
                  <button onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9C8A76' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                onClick={handleLogin}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700,
                  background: loading ? '#D4C8B8' : '#8B5E3C', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5C4A36', marginBottom: '6px' }}>
                  Select Your Name
                </label>
                <select
                  className="input"
                  value={signupForm.staff_id}
                  onChange={e => setSignupForm({ ...signupForm, staff_id: e.target.value })}
                >
                  <option value="">Select your name...</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.designation}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5C4A36', marginBottom: '6px' }}>
                  Mobile Number
                </label>
                <input
                  className="input"
                  type="tel"
                  placeholder="e.g. 01712345678"
                  value={signupForm.mobile_number}
                  onChange={e => setSignupForm({ ...signupForm, mobile_number: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5C4A36', marginBottom: '6px' }}>
                  Create Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={signupForm.password}
                    onChange={e => setSignupForm({ ...signupForm, password: e.target.value })}
                    style={{ paddingRight: '44px' }}
                  />
                  <button onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9C8A76' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5C4A36', marginBottom: '6px' }}>
                  Confirm Password
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="Re-enter password"
                  value={signupForm.confirm_password}
                  onChange={e => setSignupForm({ ...signupForm, confirm_password: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSignup()}
                />
              </div>
              <button
                onClick={handleSignup}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700,
                  background: loading ? '#D4C8B8' : '#8B5E3C', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </div>
          )}

          <button
            onClick={() => router.push('/')}
            style={{ width: '100%', marginTop: '12px', padding: '10px', fontSize: '13px', background: 'transparent', border: 'none', color: '#9C8A76', cursor: 'pointer' }}
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  )
}
