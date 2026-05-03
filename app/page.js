'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, User, Users, ChevronRight } from 'lucide-react'

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
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'white'
    }} className="split-container">
      
      {/* LEFT PANEL */}
      <div style={{
        width: '45%',
        background: '#6B3A2A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }} className="left-panel">
        <div style={{ textAlign: 'center', zIndex: 2 }}>
          <h1 style={{ 
            fontSize: '80px', 
            fontWeight: 800, 
            color: '#C9943A', 
            margin: 0,
            lineHeight: 1
          }}>CC</h1>
          <p style={{ 
            fontSize: '28px', 
            color: 'white', 
            margin: '12px 0 0 0',
            letterSpacing: '0.3em',
            fontWeight: 300,
            textTransform: 'uppercase'
          }}>Crown Coffee</p>
          <div style={{ 
            width: '60px', 
            height: '1px', 
            background: '#C9943A', 
            margin: '24px auto' 
          }} />
          <p style={{ 
            fontSize: '13px', 
            color: 'rgba(255,255,255,0.6)', 
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            margin: 0
          }}>Inventory & Stock Management</p>
        </div>
        
        <p style={{ 
          position: 'absolute', 
          bottom: '24px', 
          left: '24px', 
          fontSize: '11px', 
          color: 'rgba(255,255,255,0.3)',
          margin: 0
        }}>{new Date().getFullYear()}</p>
      </div>

      {/* RIGHT PANEL */}
      <div style={{
        width: '55%',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 56px',
        overflowY: 'auto'
      }} className="right-panel">
        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#1C1410', margin: '0 0 8px 0' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '14px', color: '#9C8A76', margin: '0 0 40px 0' }}>
            Choose your access level to continue
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* ADMIN CARD */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => router.push('/admin/login')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px 24px',
                  background: 'white',
                  border: '2px solid #6B3A2A',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  width: '100%',
                  outline: 'none'
                }}
                className="option-card admin-card"
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: '#6B3A2A',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Shield size={18} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#1C1410', margin: 0 }}>Admin Portal</p>
                  <p style={{ fontSize: '12px', color: '#9C8A76', margin: '2px 0 0 0' }}>Full system access</p>
                </div>
                <ChevronRight size={20} color="#9C8A76" />
              </button>
              <p style={{ fontSize: '11px', color: '#9C8A76', marginTop: '6px' }}>Full system access</p>
            </div>

            {/* STAFF CARD */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => router.push('/staff/login')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px 24px',
                  background: 'white',
                  border: '1px solid #E8E0D4',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  width: '100%',
                  outline: 'none'
                }}
                className="option-card staff-card"
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: '#F5F0E8',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <User size={18} color="#6B3A2A" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#1C1410', margin: 0 }}>Staff Portal</p>
                  <p style={{ fontSize: '12px', color: '#9C8A76', margin: '2px 0 0 0' }}>View your records</p>
                </div>
                <ChevronRight size={20} color="#9C8A76" />
              </button>
              <p style={{ fontSize: '11px', color: '#9C8A76', marginTop: '6px' }}>View your records</p>
            </div>

            {/* MEMBERSHIP PORTAL CARD */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => router.push('/manager/login')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px 24px',
                  background: 'white',
                  border: '1px solid #E8E0D4',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  width: '100%',
                  outline: 'none'
                }}
                className="option-card membership-card"
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: '#fef7e0',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Users size={18} color="#C9943A" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#1C1410', margin: 0 }}>Membership Portal</p>
                  <p style={{ fontSize: '12px', color: '#9C8A76', margin: '2px 0 0 0' }}>Manager access to verify and record member visits</p>
                </div>
                <ChevronRight size={20} color="#9C8A76" />
              </button>
              <p style={{ fontSize: '11px', color: '#9C8A76', marginTop: '6px' }}>Verify member cards</p>
            </div>

          </div>

          <p style={{ marginTop: '48px', fontSize: '11px', color: '#C8B8A8', textAlign: 'center' }}>
            Crown Coffee
          </p>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .split-container { flex-direction: column !important; }
          .left-panel { width: 100% !important; height: 160px !important; padding: 32px !important; }
          .left-panel h1 { fontSize: 48px !important; }
          .left-panel p:nth-child(2) { fontSize: 18px !important; }
          .left-panel div { margin: 12px auto !important; }
          .right-panel { width: 100% !important; padding: 32px 24px !important; flex: 1; }
        }
        .admin-card:hover {
          background: #FDF8F4 !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(107,58,42,0.1);
        }
        .staff-card:hover {
          border-color: #6B3A2A !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .membership-card:hover {
          border-color: #C9943A !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(201,148,58,0.1);
        }
      `}</style>
    </div>
  )
}
