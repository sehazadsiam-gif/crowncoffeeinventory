'use client'

import { useState, useEffect } from 'react'
import { Coffee, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react'

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
    <div className="min-h-screen bg-[var(--cafe-cream)] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-100 border-t-amber-900"></div>
    </div>
  )

  if (isAuthenticated) return <>{children}</>

  return (
    <div className="min-h-screen bg-[var(--cafe-brown)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--cafe-gold)]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-900/40 rounded-full blur-[100px]" />

      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex bg-[var(--cafe-gold)] p-4 rounded-3xl shadow-2xl mb-6 transform hover:rotate-12 transition-transform cursor-pointer">
            <Coffee size={40} className="text-[var(--cafe-brown)]" />
          </div>
          <h1 className="text-3xl font-display font-black text-white tracking-tight uppercase">
            Crown <span className="text-[var(--cafe-gold)]">Coffee</span>
          </h1>
          <p className="text-amber-100/60 mt-2 font-bold text-xs uppercase tracking-[0.3em]">
            System Authentication
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-amber-100/50 uppercase tracking-widest ml-1">Admin Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-100/30 group-focus-within:text-[var(--cafe-gold)] transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Username"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[var(--cafe-gold)]/50 focus:border-[var(--cafe-gold)] transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-amber-100/50 uppercase tracking-widest ml-1">Security Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-100/30 group-focus-within:text-[var(--cafe-gold)] transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[var(--cafe-gold)]/50 focus:border-[var(--cafe-gold)] transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/50 text-rose-200 text-xs font-bold p-4 rounded-xl text-center animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--cafe-gold)] hover:bg-[var(--cafe-gold-light)] text-[var(--cafe-brown)] font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transform active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-[var(--cafe-brown)]/20 border-t-[var(--cafe-brown)] rounded-full animate-spin" />
              ) : (
                <>
                  AUTHENTICATE <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-amber-100/30 font-bold text-[10px] uppercase tracking-widest">
          <ShieldCheck size={14} />
          <span>Crown Coffee Secure Network v2.0</span>
        </div>
      </div>
    </div>
  )
}
