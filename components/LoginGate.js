'use client'

import { useState, useEffect } from 'react'
import { Crown, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react'

export default function LoginGate({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const authStatus = localStorage.getItem('isAdmin')
    if (authStatus === 'true') {
      setIsAuthenticated(true)
    }
    setChecking(false)
  }, [])

  const handleLogin = (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Standard requested credentials
    if (username === 'admin' && password === 'admin12345') {
      setTimeout(() => {
        localStorage.setItem('isAdmin', 'true')
        setIsAuthenticated(true)
        setLoading(false)
        window.location.reload() // Refresh to clear any stale state
      }, 500)
    } else {
      setTimeout(() => {
        setError('Invalid username or password')
        setLoading(false)
      }, 500)
    }
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
    </div>
  )

  if (isAuthenticated) return <>{children}</>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative background elements */}
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '50%', height: '50%', background: 'var(--accent-gold)', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.05 }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '40%', height: '40%', background: 'var(--accent-brown)', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.03 }} />

      <div className="animate-in" style={{ maxWidth: '440px', width: '100%', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', background: 'var(--bg-surface)', padding: '16px', borderRadius: '20px',
            boxShadow: 'var(--shadow-md)', marginBottom: '24px', border: '1px solid var(--border-light)'
          }}>
            <Crown size={36} style={{ color: 'var(--accent-gold)' }} strokeWidth={1.5} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em', marginBottom: '8px' }}>
            Crown <span style={{ color: 'var(--accent-brown)' }}>Coffee</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            System Authentication
          </p>
        </div>

        <div className="card-premium" style={{ padding: '40px 32px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', marginLeft: '4px' }}>Admin Username</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  className="input"
                  style={{ padding: '14px 16px 14px 44px', fontSize: '14px', background: 'var(--bg-base)' }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', marginLeft: '4px' }}>Security Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="input"
                  style={{ padding: '14px 16px 14px 44px', fontSize: '14px', background: 'var(--bg-base)' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(166,60,60,0.2)', color: 'var(--danger)', fontSize: '12px', fontWeight: 600, padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: '13px', marginTop: '8px' }}
            >
              {loading ? (
                <div className="loader" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
              ) : (
                <>AUTHENTICATE <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>

        <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)' }}>
          <ShieldCheck size={14} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Crown Coffee Secure Network v2.0</span>
        </div>
      </div>
    </div>
  )
}
