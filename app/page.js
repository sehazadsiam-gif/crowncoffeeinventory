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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div className="loader"></div>
    </div>
  )

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'var(--font-sans)',
      background: 'var(--bg-base)'
    }} className="split-container page-fade-in">
      
      {/* LEFT PANEL */}
      <div style={{
        width: '45%',
        background: '#5A2810',
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
            fontWeight: 900, 
            color: 'var(--accent-gold)', 
            margin: 0,
            lineHeight: 1,
            fontFamily: 'var(--font-display)'
          }}>CC</h1>
          <p style={{ 
            fontSize: '28px', 
            color: 'white', 
            margin: '12px 0 0 0',
            letterSpacing: '0.3em',
            fontWeight: 300,
            textTransform: 'uppercase',
            fontFamily: 'var(--font-display)'
          }}>Crown Coffee</p>
          <div style={{ 
            width: '60px', 
            height: '1px', 
            background: 'var(--accent-gold)', 
            margin: '24px auto' 
          }} />
          <p style={{ 
            fontSize: '13px', 
            color: 'rgba(255,255,255,0.6)', 
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            margin: 0,
            fontFamily: 'var(--font-sans)'
          }}>Inventory & Stock Management</p>
        </div>
        
        <p style={{ 
          position: 'absolute', 
          bottom: '24px', 
          left: '24px', 
          fontSize: '11px', 
          color: 'rgba(255,255,255,0.3)',
          margin: 0,
          fontFamily: 'var(--font-mono)'
        }}>{new Date().getFullYear()}</p>
      </div>

      {/* RIGHT PANEL */}
      <div style={{
        width: '55%',
        background: 'var(--bg-surface)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 56px',
        overflowY: 'auto',
        transition: 'background-color 0.3s ease'
      }} className="right-panel">
        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0', fontFamily: 'var(--font-display)' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 40px 0', fontFamily: 'var(--font-sans)' }}>
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
                  background: 'var(--bg-card)',
                  border: '2px solid var(--accent-brown)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.25s ease',
                  width: '100%',
                  outline: 'none'
                }}
                className="option-card admin-card"
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--accent-brown)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Shield size={18} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Admin Portal</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Full system access</p>
                </div>
                <ChevronRight size={20} color="var(--text-faint)" />
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Full system access</p>
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
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.25s ease',
                  width: '100%',
                  outline: 'none'
                }}
                className="option-card staff-card"
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--accent-brown-dim)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <User size={18} color="var(--accent-brown)" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Staff Portal</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>View your records</p>
                </div>
                <ChevronRight size={20} color="var(--text-faint)" />
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>View your records</p>
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
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.25s ease',
                  width: '100%',
                  outline: 'none'
                }}
                className="option-card membership-card"
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--accent-gold-dim)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Users size={18} color="var(--accent-gold)" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Membership Portal</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Manager access to verify visits</p>
                </div>
                <ChevronRight size={20} color="var(--text-faint)" />
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Verify member cards</p>
            </div>

          </div>

          <p style={{ marginTop: '48px', fontSize: '11px', color: 'var(--text-faint)', textAlign: 'center', fontFamily: 'var(--font-display)' }}>
            Crown Coffee
          </p>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .split-container { flex-direction: column !important; }
          .left-panel { width: 100% !important; height: 160px !important; padding: 32px !important; }
          .left-panel h1 { font-size: 48px !important; }
          .left-panel p:nth-child(2) { font-size: 18px !important; }
          .left-panel div { margin: 12px auto !important; }
          .right-panel { width: 100% !important; padding: 32px 24px !important; flex: 1; }
        }
        .admin-card:hover {
          background: var(--bg-hover) !important;
          transform: translateY(-3px);
          box-shadow: 0 8px 20px var(--accent-brown-dim);
        }
        .staff-card:hover {
          border-color: var(--accent-brown) !important;
          background: var(--bg-hover) !important;
          transform: translateY(-3px);
          box-shadow: 0 8px 20px var(--accent-brown-dim);
        }
        .membership-card:hover {
          border-color: var(--accent-gold) !important;
          background: var(--bg-hover) !important;
          transform: translateY(-3px);
          box-shadow: 0 8px 20px var(--accent-gold-dim);
        }
      `}</style>
    </div>
  )
}
