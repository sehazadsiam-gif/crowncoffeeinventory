'use client'

import { useState, useEffect } from 'react'
import { Coffee, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react'

export default function LoginGate({ children }) {
  // Use sessionStorage so it survives soft reloads within the same tab, 
  // but if the user wants login "after every refresh", we can just use React state.
  // We'll use purely React state so any hard refresh = login again.
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Standard requested credentials
    if (username === 'admin' && password === 'admin12345') {
      setTimeout(() => {
        setIsAuthenticated(true)
        setLoading(false)
      }, 500)
    } else {
      setTimeout(() => {
        setError('Invalid username or password')
        setLoading(false)
      }, 500)
    }
  }

  if (isAuthenticated) return <>{children}</>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="animate-in card" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', background: 'var(--primary-light)', padding: '16px', borderRadius: '50%', marginBottom: '16px', color: 'var(--primary)' }}>
            <Coffee size={32} strokeWidth={2} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Crown Coffee
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            System Authentication Required
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="label">Username</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <User size={18} />
              </div>
              <input
                type="text"
                required
                placeholder="Enter username"
                className="input"
                style={{ paddingLeft: '38px' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="input"
                style={{ paddingLeft: '38px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '14px', fontWeight: 500, padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
          >
            {loading ? (
              <div className="loader" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
            ) : (
              <>Sign In <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
          <ShieldCheck size={14} />
          <span>Secure Authentication</span>
        </div>
      </div>
    </div>
  )
}
