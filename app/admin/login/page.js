'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, Shield, Eye, EyeOff } from 'lucide-react'

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
      minHeight: '100vh', background: '#FAF7F2',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ background: '#8B5E3C', padding: '8px', borderRadius: '10px' }}>
              <Coffee size={22} color="white" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1C1410', margin: 0 }}>Crown Coffee</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
            <Shield size={16} color="#8B5E3C" />
            <p style={{ color: '#8B5E3C', fontSize: '14px', fontWeight: 600, margin: 0 }}>Admin Portal</p>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 24px rgba(28,20,16,0.08)', border: '1px solid #E8E0D4' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1C1410', marginBottom: '24px', textAlign: 'center' }}>
            Sign in to Admin
          </h2>

          {error && (
            <div style={{ background: '#fce8e6', border: '1px solid #d93025', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#d93025' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5C4A36', marginBottom: '6px' }}>
              Username
            </label>
            <input
              className="input"
              placeholder="Enter username"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5C4A36', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
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
              border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

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
