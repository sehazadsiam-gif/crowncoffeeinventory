'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../../components/Toast'
import Navbar from '../../components/Navbar'
import { Lock, User, LogIn, Coffee } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { addToast } = useToast()

  const handleLogin = (e) => {
    e.preventDefault()
    setLoading(true)

    // Using the exact credentials requested by the user
    if (username === 'admin' && password === 'admin12345') {
      localStorage.setItem('isAdmin', 'true')
      addToast('Welcome back, Admin!', 'success')
      router.push('/admin')
    } else {
      addToast('Invalid credentials. Please try again.', 'error')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Navbar />
      
      <main className="max-w-md mx-auto px-4 py-20 flex flex-col items-center">
        <div className="bg-[var(--accent-blue)] p-4 rounded-3xl shadow-xl mb-8 animate-bounce">
          <Coffee size={40} className="text-white" />
        </div>
        
        <div className="card-premium w-full text-center">
          <h2 className="text-2xl font-black text-[var(--accent-blue)] mb-2">Admin Portal</h2>
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-8">Secure Access Only</p>
          
          <form onSubmit={handleLogin} className="space-y-6 text-left">
            <div>
              <label className="label flex items-center gap-2">
                <User size={14} className="text-[var(--gold)]" /> Username
              </label>
              <input 
                type="text" 
                className="input" 
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="label flex items-center gap-2">
                <Lock size={14} className="text-[var(--gold)]" /> Password
              </label>
              <input 
                type="password" 
                className="input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] shadow-lg hover:shadow-xl mt-4"
            >
              {loading ? 'Authenticating...' : (
                <>
                  <LogIn size={16} /> Access Dashboard
                </>
              )}
            </button>
          </form>
          
          <p className="mt-8 text-[10px] text-gray-400 font-bold uppercase tracking-tighter mb-4">
            Crown Coffee Management System v2.0
          </p>

          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', marginTop: '10px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>Are you a staff member?</p>
            <button 
              onClick={() => router.push('/portal')}
              className="btn-secondary w-full py-3 text-[10px] font-bold uppercase tracking-widest"
              style={{ borderColor: 'var(--accent-brown)', color: 'var(--accent-brown)' }}
            >
              <Users size={14} /> Go to Staff Portal
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
