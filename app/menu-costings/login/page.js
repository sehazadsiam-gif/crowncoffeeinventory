'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Coffee, Eye, EyeOff, ArrowRight, ChefHat } from 'lucide-react'

export default function CostingLoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router = useRouter()

  // If already logged in, redirect appropriately
  useEffect(() => {
    fetch('/api/costing/auth/login')
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) {
          if (d.role === 'admin') router.replace('/admin/menu-engineering')
          else router.replace('/menu-costings')
        }
      })
      .catch(() => {})
  }, [router])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/costing/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')

      if (data.user.role === 'admin') router.replace('/admin/menu-engineering')
      else router.replace('/menu-costings')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}><Coffee size={28} color="#fff" /></div>
          <div>
            <div style={styles.logoTitle}>Crown Coffee</div>
            <div style={styles.logoSub}>Menu Costing System</div>
          </div>
        </div>

        <h1 style={styles.heading}>Sign in</h1>
        <p style={styles.sub}>Chef & Admin access</p>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email address
            <input
              id="costing-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@crowncoffee.com"
              required
              autoComplete="email"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Password
            <div style={styles.pwdWrap}>
              <input
                id="costing-password"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ ...styles.input, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={styles.eyeBtn}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <button
            id="costing-login-btn"
            type="submit"
            disabled={loading}
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in…' : (
              <><span>Sign in</span><ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div style={styles.roleHint}>
          <ChefHat size={14} color="var(--text-muted)" />
          <span>Chefs access Menu Costings · Admins access Menu Engineering</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-base)',
    padding: '24px 16px',
  },
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    boxShadow: 'var(--shadow-lg)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: 'linear-gradient(135deg, var(--accent-brown), var(--accent-gold))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoTitle: { fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' },
  logoSub:   { fontSize: 12, color: 'var(--text-muted)', marginTop: 1 },
  heading: { fontSize: 24, fontWeight: 700, marginBottom: 4 },
  sub:     { fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 },
  errorBox: {
    background: 'var(--danger-bg)',
    border: '1px solid var(--danger)',
    color: 'var(--danger)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: 13,
    marginBottom: 18,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-medium)',
    background: 'var(--bg-subtle)',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'var(--font-sans)',
  },
  pwdWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    padding: 4,
  },
  btn: {
    marginTop: 4,
    padding: '13px 20px',
    borderRadius: 'var(--radius-md)',
    background: 'linear-gradient(135deg, var(--accent-brown), var(--accent-brown-dark))',
    color: '#fff',
    fontWeight: 600,
    fontSize: 15,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'opacity 0.2s',
  },
  roleHint: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 28,
    fontSize: 12,
    color: 'var(--text-muted)',
    textAlign: 'center',
    justifyContent: 'center',
  },
}
