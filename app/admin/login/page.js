'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (token && role === 'admin') router.replace('/dashboard')
  }, [router])

  async function handleLogin() {
    if (!form.username || !form.password) {
      setError('Please enter username and password')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      localStorage.setItem('cc_token', data.token)
      localStorage.setItem('cc_role', 'admin')
      localStorage.setItem('cc_username', data.username)
      router.replace('/dashboard')
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
            maxWidth: '200px', 
            lineHeight: '1.8',
            fontStyle: 'italic',
            margin: '0 auto'
          }}>
            "Managing every grain, every cup, every day."
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

        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1C1410', margin: '0 0 8px 0' }}>
            Admin Sign In
          </h2>
          <p style={{ fontSize: '13px', color: '#9C8A76', margin: '0 0 32px 0' }}>
            Enter your credentials to access the management system
          </p>

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
              <label style={{ 
                display: 'block', 
                fontSize: '11px', 
                fontWeight: 600, 
                color: '#9C8A76', 
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>Username</label>
              <input
                className="custom-input"
                type="text"
                placeholder="Enter username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '11px', 
                fontWeight: 600, 
                color: '#9C8A76', 
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="custom-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
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
            <p style={{ marginTop: '16px', fontSize: '11px', color: '#9C8A76', textAlign: 'center' }}>
              For membership verification, use the<br/>
              Membership Portal at the home page.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .split-container { overflow: hidden; }
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
