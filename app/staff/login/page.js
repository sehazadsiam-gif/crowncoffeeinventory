'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Eye, EyeOff, AlertCircle, Coffee, Lock } from 'lucide-react'

export default function StaffLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (token && role === 'staff') router.replace('/staff-portal')
  }, [router])

  async function handleLogin() {
    if (!password.trim()) {
      setError('Please enter your passcode')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password.trim()
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
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100dvh',
      fontFamily: 'var(--font-sans)',
      background: 'var(--bg-base)'
    }} className="split-container">

      {/* ── LEFT PANEL (Brand) ── */}
      <div style={{
        width: '42%',
        background: 'linear-gradient(160deg, #3D1A0A 0%, #6B3A2A 45%, #A0562A 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '56px 40px',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }} className="left-panel">

        {/* Subtle dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1.5px, transparent 1.5px)',
          backgroundSize: '26px 26px',
          pointerEvents: 'none'
        }} />

        {/* Decorative blur blobs */}
        <div style={{ position: 'absolute', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(212,147,58,0.14)', filter: 'blur(60px)', top: '-60px', right: '-60px' }} />
        <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(50px)', bottom: '-40px', left: '-40px' }} />

        <div style={{ textAlign: 'center', zIndex: 2, opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease' }}>
          {/* Logo */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '24px',
            background: 'rgba(255,255,255,0.12)',
            border: '1.5px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
          }}>
            <Coffee size={38} color="white" />
          </div>

          <h1 style={{
            fontSize: '48px', fontWeight: 900, color: '#D4933A',
            margin: 0, lineHeight: 1, letterSpacing: '-0.04em',
            fontFamily: 'var(--font-sans)'
          }}>CC</h1>

          <p style={{
            fontSize: '18px', color: 'rgba(255,255,255,0.90)',
            margin: '10px 0 0',
            letterSpacing: '0.35em',
            fontWeight: 300,
            textTransform: 'uppercase',
            fontFamily: 'var(--font-sans)'
          }}>Crown Coffee</p>

          <div style={{ width: '48px', height: '2px', background: 'linear-gradient(90deg, transparent, #D4933A, transparent)', margin: '22px auto' }} />

          <p style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.50)',
            maxWidth: '200px', lineHeight: '1.8', fontStyle: 'italic',
            margin: '0 auto', fontFamily: 'var(--font-sans)'
          }}>
            "Your workspace, your records, your progress."
          </p>

          {/* Feature bullets */}
          <div style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', maxWidth: '210px', margin: '36px auto 0' }}>
            {[
              '📊 Live salary & attendance',
              '📅 Leave request tracking',
              '💬 Message your admin',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D4933A', flexShrink: 0 }} />
                <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-sans)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (Form) ── */}
      <div style={{
        flex: 1,
        background: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 56px',
        position: 'relative',
        overflowY: 'auto',
        minHeight: '100dvh',
      }} className="right-panel">

        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          style={{
            position: 'absolute', top: '32px', left: '56px',
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: '13px',
            cursor: 'pointer', padding: '4px 0',
            fontFamily: 'var(--font-sans)', fontWeight: 600,
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto', opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease 0.1s' }}>

          {/* Heading */}
          <div style={{ marginBottom: '36px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'var(--accent-brown-dim)', borderRadius: '20px',
              padding: '5px 14px', marginBottom: '16px'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-brown)' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-brown)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Staff Portal</span>
            </div>
            <h2 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em', fontFamily: 'var(--font-sans)' }}>
              Welcome back 👋
            </h2>
            <p style={{ fontSize: '14.5px', color: 'var(--text-muted)', marginTop: '8px', fontFamily: 'var(--font-sans)' }}>
              Enter your passcode to access your account
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'var(--danger-bg)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '24px',
              fontSize: '13.5px',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeInUp 0.25s ease'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Password */}
            <div>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 700,
                color: 'var(--text-muted)', marginBottom: '7px',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                fontFamily: 'var(--font-sans)'
              }}>Passcode</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="e.g. shahadat@cc"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  style={{
                    width: '100%', padding: '12px 44px 12px 42px',
                    fontSize: '14px', border: '1.5px solid var(--border-medium)',
                    borderRadius: '12px', outline: 'none',
                    background: 'var(--bg-subtle)', color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    transition: 'all 0.2s'
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent-brown)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-brown-glow)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-medium)'; e.target.style.boxShadow = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    padding: '4px', display: 'flex', alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%', height: '50px',
                background: loading
                  ? 'var(--border-medium)'
                  : 'linear-gradient(135deg, #6B3A2A 0%, #A05228 100%)',
                color: 'white', border: 'none',
                borderRadius: '12px', fontSize: '15px',
                fontWeight: 700, letterSpacing: '0.02em',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.25s ease',
                fontFamily: 'var(--font-sans)',
                boxShadow: loading ? 'none' : 'var(--shadow-glow-brown)',
                marginTop: '4px'
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,58,30,0.40)' }}}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = loading ? 'none' : 'var(--shadow-glow-brown)' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span className="loader" style={{ width: '18px', height: '18px', borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </button>

            {/* Info box */}
            <div style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: '10px',
              padding: '13px 16px',
              fontSize: '12.5px',
              color: 'var(--text-muted)',
              lineHeight: '1.65',
              fontFamily: 'var(--font-sans)'
            }}>
              🔐 Your username and password were provided by your admin. Contact admin if you have trouble signing in.
            </div>

            {/* Recent updates */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
                Recent Updates
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { title: 'New Payroll Rules', body: 'First 4 absent days per month are now FREE (paid). Unpaid deductions only start from the 5th day.' },
                  { title: 'Portal Enhancements', body: 'View detailed salary breakdowns, leave requests, and message your admin directly.' },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-subtle)', border: '1px solid var(--border-light)',
                    borderRadius: '10px', padding: '12px 14px'
                  }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 3px', fontFamily: 'var(--font-sans)' }}>{item.title}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.55', fontFamily: 'var(--font-sans)' }}>{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .split-container { flex-direction: column !important; }
          .left-panel { width: 100% !important; height: 160px !important; padding: 28px 24px !important; min-height: unset !important; }
          .right-panel { width: 100% !important; padding: 32px 20px 40px !important; min-height: unset !important; }
          .right-panel > button:first-child { top: 16px !important; left: 20px !important; }
        }
        @media (min-width: 1920px) {
          .left-panel { width: 38% !important; }
          .right-panel { padding: 64px 80px !important; }
          .right-panel > div { max-width: 500px !important; }
        }
      `}</style>
    </div>
  )
}