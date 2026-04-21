'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import { User, ArrowRight, Coffee, ShieldCheck } from 'lucide-react'

export default function StaffPortalLogin() {
  const [staff, setStaff] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    // Check if already logged in
    const savedId = localStorage.getItem('staffPortalId')
    if (savedId) {
      router.push('/portal/dashboard')
      return
    }
    fetchStaff()
  }, [])

  async function fetchStaff() {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      setStaff(data || [])
    } catch (err) {
      addToast('Error loading staff list', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleLogin() {
    if (!selectedStaffId) {
      addToast('Please select your name', 'error')
      return
    }
    localStorage.setItem('staffPortalId', selectedStaffId)
    addToast('Welcome to the Staff Portal', 'success')
    router.push('/portal/dashboard')
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#FAF7F2', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div className="card animate-in" style={{ maxWidth: '400px', width: '100%', padding: '40px', textAlign: 'center' }}>
        <div style={{ 
          background: 'var(--accent-gold-dim)', 
          width: '64px', 
          height: '64px', 
          borderRadius: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 24px',
          color: 'var(--accent-brown)'
        }}>
          <Coffee size={32} />
        </div>
        
        <h1 style={{ fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 700 }}>
          Staff Portal
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>
          Select your name to view your progress and payments.
        </p>

        <div style={{ textAlign: 'left', marginBottom: '24px' }}>
          <label className="label" style={{ marginBottom: '8px' }}>Select Your Name</label>
          <div style={{ position: 'relative' }}>
            <select 
              className="input" 
              style={{ paddingLeft: '40px', height: '48px', appearance: 'none' }}
              value={selectedStaffId}
              onChange={e => setSelectedStaffId(e.target.value)}
            >
              <option value="">Choose name...</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <User size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <button 
          onClick={handleLogin}
          className="btn-primary" 
          style={{ width: '100%', height: '48px', justifyContent: 'center', fontSize: '16px' }}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Enter Portal'} <ArrowRight size={18} />
        </button>

        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
          <ShieldCheck size={14} /> Secure access for Crown Coffee Staff
        </div>
      </div>
    </div>
  )
}
