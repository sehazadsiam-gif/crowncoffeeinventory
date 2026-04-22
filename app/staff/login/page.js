'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, User, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function StaffLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (token && role === 'staff') router.replace('/staff-portal')
  }, [router])

  async function handleLogin() {
    if (!loginForm.username || !loginForm.password) {
      setError('Please enter username and password')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username.toLowerCase().trim(),
          password: loginForm.password
        })
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

          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ background: '#F5F0E8', padding: '8px', borderRadius: '8px' }}>
                <User size={18} color="#6B3A2A" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B3A2A' }}>Staff Portal</span>
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1C1410', margin: 0 }}>
              Welcome back
            </h2>
            <p style={{ fontSize: '14px', color: '#9C8A76', marginTop: '6px' }}>
              Sign in with your username and password
            </p>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="custom-label">Username</label>
              <input
                className="custom-input"
                type="text"
                placeholder="Enter your username"
                value={loginForm.username}
                onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoCapitalize="none"
                autoCorrect="off"
              />
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
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: '#9C8A76'
                  }}
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
                background: loading ? '#D4C8B8' : '#6B3A2A',
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

            <div style={{
              background: '#F5F0E8',
              borderRadius: '8px',
              padding: '14px 16px',
              fontSize: '12px',
              color: '#9C8A76',
              lineHeight: '1.6'
            }}>
              Your username and password have been provided by admin.
              Contact admin if you have trouble signing in.
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .split-container { overflow: hidden; }
        .custom-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #9C8A76;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .custom-input {
          width: 100%;
          padding: 11px 14px;
          font-size: 14px;
          border: 1px solid #E8E0D4;
          border-radius: 8px;
          outline: none;
          transition: all 0.2s ease;
          background: #FFFFFF;
          color: #1C1410;
          font-family: system-ui, sans-serif;
        }
        .custom-input:focus {
          border-color: #6B3A2A;
          box-shadow: 0 0 0 3px rgba(107,58,42,0.08);
        }
        .signin-btn:hover:not(:disabled) {
          background: #5A3022 !important;
        }
        @media (max-width: 768px) {
          .split-container { flex-direction: column !important; }
          .left-panel { width: 100% !important; height: 180px !important; padding: 32px !important; }
          .right-panel { width: 100% !important; padding: 32px 24px !important; flex: 1; }
          .right-panel button:first-child { top: 20px; left: 24px; }
        }
      `}</style>
    </div>
  )
}