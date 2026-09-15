'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Shield, User, Users, ChevronRight } from 'lucide-react'

const ConstellationField = dynamic(
  () => import('@designcodeio/threeui').then((m) => m.ConstellationField),
  { ssr: false }
)

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
        background: '#451e0b',
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
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          opacity: 0.4,
          pointerEvents: 'none',
        }}>
          <ConstellationField
            mode="dark"
            speed={0.6}
            size={0.85}
            strokeWidth={0.8}
            density={0.8}
            opacity={0.65}
            hue={25}
            saturation={1.2}
            brightness={1.05}
          />
        </div>
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
                className="option-card admin-card live-animated-btn"
              >
                <div className="sheen-layer" />
                <div className="icon-wrapper admin-icon-wrapper">
                  <Shield size={19} color="white" />
                  <span className="icon-pulse-ring" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Admin Portal</p>
                    <span className="live-status-dot admin-dot" />
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Full system access</p>
                </div>
                <div className="chevron-animated">
                  <ChevronRight size={20} color="var(--accent-brown)" />
                </div>
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Full system access</p>
            </div>

            {/* STAFF CARD */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => router.push('/staff/login')}
                className="option-card staff-card live-animated-btn"
              >
                <div className="sheen-layer" />
                <div className="icon-wrapper staff-icon-wrapper">
                  <User size={19} color="var(--accent-brown)" />
                  <span className="icon-pulse-ring" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Staff Portal</p>
                    <span className="live-status-dot staff-dot" />
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>View your records</p>
                </div>
                <div className="chevron-animated">
                  <ChevronRight size={20} color="var(--accent-brown)" />
                </div>
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>View your records</p>
            </div>

            {/* MEMBERSHIP PORTAL CARD */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => router.push('/manager/login')}
                className="option-card membership-card live-animated-btn"
              >
                <div className="sheen-layer" />
                <div className="icon-wrapper member-icon-wrapper">
                  <Users size={19} color="var(--accent-gold)" />
                  <span className="icon-pulse-ring" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Membership Portal</p>
                    <span className="live-status-dot member-dot" />
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Manager access to verify visits</p>
                </div>
                <div className="chevron-animated">
                  <ChevronRight size={20} color="var(--accent-gold)" />
                </div>
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

        .live-animated-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          background: var(--bg-card);
          border-radius: 14px;
          cursor: pointer;
          text-align: left;
          width: 100%;
          outline: none;
          overflow: hidden;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Continuous live light sheen sweeping across each button */
        .sheen-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }
        .sheen-layer::after {
          content: '';
          position: absolute;
          top: 0;
          left: -120%;
          width: 80%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          transform: skewX(-25deg);
          animation: liveSheen 4.2s ease-in-out infinite;
        }

        @keyframes liveSheen {
          0%, 15% {
            left: -120%;
          }
          65%, 100% {
            left: 200%;
          }
        }

        .admin-card .sheen-layer::after {
          animation-delay: 0s;
        }
        .staff-card .sheen-layer::after {
          animation-delay: 1.4s;
        }
        .membership-card .sheen-layer::after {
          animation-delay: 2.8s;
        }

        /* Continuous breathing border & ambient shadows */
        .admin-card {
          border: 2px solid rgba(124, 58, 30, 0.5) !important;
          animation: adminAura 3s ease-in-out infinite alternate;
        }
        @keyframes adminAura {
          0% {
            border-color: rgba(124, 58, 30, 0.4);
            box-shadow: 0 4px 16px rgba(124, 58, 30, 0.08), 0 0 0 0 rgba(124, 58, 30, 0.15);
          }
          100% {
            border-color: rgba(124, 58, 30, 0.85);
            box-shadow: 0 8px 26px rgba(124, 58, 30, 0.22), 0 0 14px 2px rgba(124, 58, 30, 0.25);
          }
        }

        .staff-card {
          border: 2px solid rgba(176, 99, 62, 0.4) !important;
          animation: staffAura 3.3s ease-in-out infinite alternate 0.6s;
        }
        @keyframes staffAura {
          0% {
            border-color: rgba(176, 99, 62, 0.3);
            box-shadow: 0 4px 16px rgba(176, 99, 62, 0.06), 0 0 0 0 rgba(176, 99, 62, 0.12);
          }
          100% {
            border-color: rgba(176, 99, 62, 0.8);
            box-shadow: 0 8px 26px rgba(176, 99, 62, 0.18), 0 0 14px 2px rgba(176, 99, 62, 0.22);
          }
        }

        .membership-card {
          border: 2px solid rgba(212, 147, 58, 0.5) !important;
          animation: memberAura 3.6s ease-in-out infinite alternate 1.2s;
        }
        @keyframes memberAura {
          0% {
            border-color: rgba(212, 147, 58, 0.38);
            box-shadow: 0 4px 16px rgba(212, 147, 58, 0.1), 0 0 0 0 rgba(212, 147, 58, 0.18);
          }
          100% {
            border-color: rgba(212, 147, 58, 0.95);
            box-shadow: 0 8px 28px rgba(212, 147, 58, 0.28), 0 0 16px 3px rgba(212, 147, 58, 0.3);
          }
        }

        /* Icon wrapper with live breathing ring */
        .icon-wrapper {
          position: relative;
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          z-index: 2;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .admin-icon-wrapper {
          background: var(--accent-brown);
        }
        .staff-icon-wrapper {
          background: var(--accent-brown-dim);
        }
        .member-icon-wrapper {
          background: var(--accent-gold-dim);
        }

        .icon-pulse-ring {
          position: absolute;
          inset: -4px;
          border-radius: 14px;
          border: 1.5px solid currentColor;
          opacity: 0;
          animation: pulseRing 2.6s ease-out infinite;
          pointer-events: none;
        }
        .admin-icon-wrapper .icon-pulse-ring {
          color: var(--accent-brown);
          animation-delay: 0s;
        }
        .staff-icon-wrapper .icon-pulse-ring {
          color: var(--accent-brown);
          animation-delay: 0.8s;
        }
        .member-icon-wrapper .icon-pulse-ring {
          color: var(--accent-gold);
          animation-delay: 1.6s;
        }

        @keyframes pulseRing {
          0% {
            transform: scale(0.9);
            opacity: 0.8;
          }
          60% {
            transform: scale(1.35);
            opacity: 0;
          }
          100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }

        /* Live status beacon dot */
        .live-status-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          animation: beaconPulse 2s ease-in-out infinite;
        }
        .admin-dot {
          background: #10B981;
          box-shadow: 0 0 6px #10B981;
        }
        .staff-dot {
          background: var(--accent-brown);
          box-shadow: 0 0 6px var(--accent-brown);
        }
        .member-dot {
          background: var(--accent-gold);
          box-shadow: 0 0 6px var(--accent-gold);
        }

        @keyframes beaconPulse {
          0%, 100% {
            transform: scale(0.85);
            opacity: 0.55;
          }
          50% {
            transform: scale(1.35);
            opacity: 1;
          }
        }

        /* Live Chevron micro-drift */
        .chevron-animated {
          z-index: 2;
          display: flex;
          align-items: center;
          animation: chevronLiveDrift 2s ease-in-out infinite;
          transition: transform 0.25s ease;
        }
        @keyframes chevronLiveDrift {
          0%, 100% {
            transform: translateX(0);
            opacity: 0.7;
          }
          50% {
            transform: translateX(4px);
            opacity: 1;
          }
        }

        /* Hover & Active tactile micro-spring states */
        .live-animated-btn:hover {
          transform: translateY(-4px) scale(1.015) !important;
          background: var(--bg-hover) !important;
        }
        .live-animated-btn:hover .icon-wrapper {
          transform: scale(1.1) rotate(-3deg);
        }
        .live-animated-btn:hover .chevron-animated {
          animation: none;
          transform: translateX(6px) !important;
        }
        .live-animated-btn:active {
          transform: translateY(-1px) scale(0.99) !important;
        }
      `}</style>
    </div>
  )
}
