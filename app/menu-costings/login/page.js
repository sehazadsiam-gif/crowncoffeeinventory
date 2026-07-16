'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, Eye, EyeOff, ArrowRight, ChefHat, Shield, ArrowLeft, Lock } from 'lucide-react'

export default function CostingLoginPage() {
  const [selectedRole, setSelectedRole] = useState(null) // 'chef' | 'admin' | null
  const [password, setPassword]         = useState('')
  const [showPwd, setShowPwd]           = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
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

  function handleSelectRole(role) {
    setSelectedRole(role)
    setPassword('')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedRole || !password) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/costing/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')

      if (data.user.role === 'admin') {
        router.replace('/admin/menu-engineering')
      } else {
        router.replace('/menu-costings')
      }
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
            <div style={styles.logoSub}>Menu Costing &amp; Engineering</div>
          </div>
        </div>

        {!selectedRole ? (
          /* STEP 1: Select Role */
          <div>
            <h1 style={styles.heading}>Select Access Role</h1>
            <p style={styles.sub}>Tap a role below to enter your password</p>

            <div style={styles.rolesGrid}>
              {/* Chef Card */}
              <button
                id="select-role-chef"
                type="button"
                onClick={() => handleSelectRole('chef')}
                style={styles.roleCard}
              >
                <div style={{ ...styles.roleCardIcon, background: 'var(--accent-brown-dim)', color: 'var(--accent-brown)' }}>
                  <ChefHat size={28} />
                </div>
                <div style={styles.roleCardBody}>
                  <div style={styles.roleCardTitle}>Chef / Barista</div>
                  <div style={styles.roleCardSub}>Manage ingredient costs &amp; COGS breakdown</div>
                </div>
                <ArrowRight size={18} color="var(--text-muted)" />
              </button>

              {/* Admin Card */}
              <button
                id="select-role-admin"
                type="button"
                onClick={() => handleSelectRole('admin')}
                style={styles.roleCard}
              >
                <div style={{ ...styles.roleCardIcon, background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }}>
                  <Shield size={28} />
                </div>
                <div style={styles.roleCardBody}>
                  <div style={styles.roleCardTitle}>Admin</div>
                  <div style={styles.roleCardSub}>Channel pricing, sales matrix &amp; profitability</div>
                </div>
                <ArrowRight size={18} color="var(--text-muted)" />
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: Enter Password */
          <div>
            <button
              type="button"
              onClick={() => handleSelectRole(null)}
              style={styles.backBtn}
            >
              <ArrowLeft size={14} /> Back to role selection
            </button>

            <div style={styles.selectedRoleBadge}>
              {selectedRole === 'chef' ? (
                <>
                  <ChefHat size={18} color="var(--accent-brown)" />
                  <span>Chef / Barista Access</span>
                </>
              ) : (
                <>
                  <Shield size={18} color="var(--accent-blue)" />
                  <span>Admin Access</span>
                </>
              )}
            </div>

            <h1 style={styles.heading}>Enter Password</h1>
            <p style={styles.sub}>
              Password for <strong>{selectedRole === 'chef' ? 'Chef' : 'Admin'}</strong>
            </p>

            {error && <div style={styles.errorBox}>{error}</div>}

            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.label}>
                Password
                <div style={styles.pwdWrap}>
                  <input
                    id="role-password-input"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={`Enter ${selectedRole} password…`}
                    required
                    autoFocus
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
                id="role-login-btn"
                type="submit"
                disabled={loading}
                style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Verifying…' : (
                  <><span>Sign In</span><ArrowRight size={16} /></>
                )}
              </button>
            </form>
          </div>
        )}
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
    fontFamily: 'var(--font-sans)',
  },
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-xl)',
    padding: '40px 36px',
    width: '100%',
    maxWidth: 440,
    boxShadow: 'var(--shadow-lg)',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'linear-gradient(135deg, var(--accent-brown), var(--accent-gold))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoTitle: { fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' },
  logoSub:   { fontSize: 12, color: 'var(--text-muted)', marginTop: 1 },
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub:     { fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 },
  rolesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginTop: 12,
  },
  roleCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 18px',
    borderRadius: 'var(--radius-lg)',
    border: '1.5px solid var(--border-light)',
    background: 'var(--bg-subtle)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    width: '100%',
    fontFamily: 'var(--font-sans)',
  },
  roleCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roleCardBody: { flex: 1 },
  roleCardTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' },
  roleCardSub:   { fontSize: 12, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.3 },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 0',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 16,
    fontFamily: 'var(--font-sans)',
  },
  selectedRoleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    borderRadius: 20,
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border-light)',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 16,
  },
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
}
