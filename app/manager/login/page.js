'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, User } from 'lucide-react'

export default function ManagerLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/manager-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (res.ok) {
        localStorage.setItem('cc_token', data.token)
        localStorage.setItem('cc_role', data.role)
        localStorage.setItem('cc_username', data.username)
        router.replace('/manager')
      } else {
        setError(data.error || 'Invalid credentials')
        setLoading(false)
      }
    } catch (err) {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left Panel */}
      <div style={{
        width: '42%', background: '#6B3A2A', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', padding: '40px'
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', border: '3px solid #C9943A',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24
        }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#C9943A', fontFamily: 'Georgia, serif' }}>CC</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 8 }}>CROWN COFFEE</h1>
        <div style={{ width: 40, height: 2, background: '#C9943A', marginBottom: 24 }} />
        <p style={{ fontSize: 18, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Manager Portal</p>
      </div>

      {/* Right Panel */}
      <div style={{
        width: '58%', background: '#FFFFFF', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '40px'
      }}>
        <div style={{ maxWidth: 360, width: '100%' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Sign In</h2>
          <p style={{ color: '#64748B', fontSize: 14, marginBottom: 32 }}>Enter your manager credentials to continue.</p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={iconStyle} />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={inputStyle}
                  placeholder="manager_username"
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={iconStyle} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, padding: '12px', color: '#DC2626', fontSize: 14, marginBottom: 20
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', background: '#6B3A2A', color: '#FFFFFF',
                border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              {loading && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          div[style*="display: flex"] { flex-direction: column !important; }
          div[style*="width: 42%"], div[style*="width: 58%"] { width: 100% !important; }
          div[style*="width: 42%"] { min-height: 200px !important; }
        }
      `}</style>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }
const iconStyle = { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }
const inputStyle = { width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 14, outline: 'none' }
