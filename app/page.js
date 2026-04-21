'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Coffee, Shield, User } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('cc_token')
    const role = localStorage.getItem('cc_role')
    if (token && role === 'admin') {
      router.replace('/dashboard')
    } else if (token && role === 'staff') {
      router.replace('/staff-portal')
    } else {
      setChecking(false)
    }
  }, [router])

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
      <div className="loader"></div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAF7F2',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '24px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#8B5E3C', padding: '10px', borderRadius: '12px' }}>
            <Coffee size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#1C1410', margin: 0 }}>
            Crown Coffee
          </h1>
        </div>
        <p style={{ color: '#9C8A76', fontSize: '15px', margin: 0 }}>
          Inventory and Stock Management System
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        width: '100%',
        maxWidth: '580px'
      }}>

        <button
          onClick={() => router.push('/admin/login')}
          style={{
            background: 'white',
            border: '2px solid #8B5E3C',
            borderRadius: '16px',
            padding: '32px 24px',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(139,94,60,0.1)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#8B5E3C'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'white'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ background: '#F5F0E8', padding: '14px', borderRadius: '12px' }}>
              <Shield size={28} color="#8B5E3C" />
            </div>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1C1410', margin: '0 0 8px 0' }}>
            Admin Login
          </h2>
          <p style={{ fontSize: '13px', color: '#9C8A76', margin: 0 }}>
            Manage inventory, staff, payroll and all operations
          </p>
        </button>

        <button
          onClick={() => router.push('/staff/login')}
          style={{
            background: 'white',
            border: '2px solid #E8E0D4',
            borderRadius: '16px',
            padding: '32px 24px',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(28,20,16,0.06)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#8B5E3C'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#E8E0D4'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{ background: '#F5F0E8', padding: '14px', borderRadius: '12px' }}>
              <User size={28} color="#8B5E3C" />
            </div>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1C1410', margin: '0 0 8px 0' }}>
            Staff Login
          </h2>
          <p style={{ fontSize: '13px', color: '#9C8A76', margin: 0 }}>
            View your salary, attendance, advances and remarks
          </p>
        </button>

      </div>

      <p style={{ marginTop: '40px', fontSize: '12px', color: '#C8B8A8' }}>
        Crown Coffee Inventory and Stock Management
      </p>
    </div>
  )
}
