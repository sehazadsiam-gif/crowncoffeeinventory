'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { CheckCircle, ArrowLeft, Mail, Coffee, Sparkles, ShieldCheck } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') || 'Valued Customer'
  const email = searchParams.get('email') || 'your email'

  return (
    <div style={{
      minHeight: '100vh', 
      background: '#FAF6F0',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
    }}>
      {/* Premium ambient decorative elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(201,148,58,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: '45%', height: '45%', background: 'radial-gradient(circle, rgba(123,74,46,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{
        maxWidth: '540px', 
        width: '100%', 
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        
        {/* Success Icon Badge */}
        <div style={{
          width: '72px', 
          height: '72px', 
          borderRadius: '50%', 
          background: 'rgba(46,125,50,0.08)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 24px',
          border: '2px solid #2E7D32',
          boxShadow: '0 4px 20px rgba(46,125,50,0.15)',
          animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
        }}>
          <CheckCircle size={32} color="#2E7D32" strokeWidth={2.5} />
        </div>

        {/* Heading */}
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 900, 
          color: '#1E110A', 
          marginBottom: '12px', 
          letterSpacing: '-1px',
          lineHeight: 1.15
        }}>
          Welcome to the Club!
        </h1>
        <p style={{ 
          fontSize: '15px', 
          color: '#5C524C', 
          lineHeight: 1.6, 
          marginBottom: '28px',
          maxWidth: '440px',
          margin: '0 auto 28px auto'
        }}>
          Your application was approved! You are now an active member of the <strong>Crown Coffee Club</strong>.
        </p>

        {/* Dynamic Premium Virtual VIP Card */}
        <div className="card-vip-success" style={{
          background: 'linear-gradient(135deg, #1E110A 0%, #351F14 100%)',
          borderRadius: '24px',
          padding: '24px 28px',
          position: 'relative',
          boxShadow: '0 20px 45px rgba(30,17,10,0.22)',
          border: '1px solid rgba(251,248,245,0.08)',
          overflow: 'hidden',
          textAlign: 'left',
          marginBottom: '32px',
          aspectRatio: '1.68 / 1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          animation: 'cardReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s',
          opacity: 0,
          transform: 'translateY(20px)'
        }}>
          {/* Card overlay shine */}
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.02) 100%)', 
            pointerEvents: 'none' 
          }} />

          {/* Card Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #C9943A, #E4B869)',
                borderRadius: '8px',
                padding: '6px'
              }}>
                <Coffee size={16} color="#1E110A" strokeWidth={2.5} />
              </div>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: 800, 
                color: '#FAF6F0', 
                letterSpacing: '1px',
                fontFamily: "'Georgia', serif"
              }}>
                CROWN COFFEE
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(46,125,50,0.15)', color: '#4CAF50', padding: '4px 10px', borderRadius: '100px', fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px' }}>
              <ShieldCheck size={10} /> INSTANT ACTIVE
            </div>
          </div>

          {/* Card Holder Name */}
          <div>
            <span style={{ fontSize: '8px', color: '#A2968E', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
              CLUB MEMBER
            </span>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 700, 
              color: '#FAF6F0', 
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {name}
            </span>
          </div>

          {/* Card Footer */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-end',
            borderTop: '1px solid rgba(250,246,240,0.1)',
            paddingTop: '12px' 
          }}>
            <div>
              <span style={{ fontSize: '8px', color: '#A2968E', letterSpacing: '1px', display: 'block', textTransform: 'uppercase' }}>
                WELCOME TIER
              </span>
              <span style={{ fontSize: '10px', color: '#C9943A', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                SILVER MEMBERSHIP
              </span>
            </div>
            
            <div style={{ fontSize: '10px', color: '#A2968E', fontStyle: 'italic' }}>
              Est. {new Date().getFullYear()}
            </div>
          </div>
        </div>

        {/* Steps/Info Box */}
        <div style={{
          background: '#FFFFFF', 
          border: '1px solid #E8DCD3', 
          borderRadius: '20px',
          padding: '28px', 
          textAlign: 'left', 
          marginBottom: '32px',
          boxShadow: '0 4px 20px rgba(30,17,10,0.02)'
        }}>
          <h3 style={{ 
            fontSize: '15px', 
            fontWeight: 800, 
            color: '#1E110A', 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Sparkles size={16} style={{ color: '#C9943A' }} /> What Happens Next
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                background: '#FAF6F0',
                color: '#7B4A2E', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '12px', 
                fontWeight: 800, 
                flexShrink: 0,
                border: '1px solid #E8DCD3'
              }}>1</div>
              <div style={{ paddingTop: '2px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1E110A', margin: '0 0 2px 0' }}>Welcome Email & SMS Sent</h4>
                <p style={{ fontSize: '12px', color: '#5C524C', margin: 0, lineHeight: 1.4 }}>
                  We've dispatched your dynamic digital membership card to <strong style={{ color: '#1E110A' }}>{email}</strong> and SMS confirmation to your mobile device.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                background: '#FAF6F0',
                color: '#7B4A2E', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '12px', 
                fontWeight: 800, 
                flexShrink: 0,
                border: '1px solid #E8DCD3'
              }}>2</div>
              <div style={{ paddingTop: '2px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1E110A', margin: '0 0 2px 0' }}>Instant 5% Loyalty Discounts</h4>
                <p style={{ fontSize: '12px', color: '#5C524C', margin: 0, lineHeight: 1.4 }}>
                  Simply state your registered phone number or email address on your next cafe checkout to redeem automatic discounts instantly.
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                background: '#FAF6F0',
                color: '#7B4A2E', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '12px', 
                fontWeight: 800, 
                flexShrink: 0,
                border: '1px solid #E8DCD3'
              }}>3</div>
              <div style={{ paddingTop: '2px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1E110A', margin: '0 0 2px 0' }}>Coffee Punch Card Activated</h4>
                <p style={{ fontSize: '12px', color: '#5C524C', margin: 0, lineHeight: 1.4 }}>
                  Every check-in registers a punch. Reach 5 punches and enjoy a completely complimentary premium coffee drink on the house!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '16px 40px', 
              background: 'linear-gradient(135deg, #2C1A11 0%, #1E110A 100%)', 
              color: '#FFFFFF',
              borderRadius: '14px', 
              fontSize: '15px', 
              fontWeight: 800,
              textDecoration: 'none', 
              boxShadow: '0 4px 14px rgba(30,17,10,0.12)',
              transition: 'all 0.2s ease'
            }}
            id="membership-success-home"
            className="home-btn"
          >
            Return to Homepage
          </Link>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(20px) rotate(-1deg); }
          to { opacity: 1; transform: translateY(0) rotate(0deg); }
        }

        .home-btn:hover {
          background: linear-gradient(135deg, #1E110A 0%, #3F2314 100%) !important;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(30,17,10,0.2) !important;
        }

        .card-vip-success:hover {
          transform: translateY(-4px) rotate(0.5deg) !important;
          box-shadow: 0 25px 55px rgba(30,17,10,0.3) !important;
          border-color: rgba(201,148,58,0.2) !important;
        }

        @media (max-width: 768px) {
          .card-vip-success {
            aspect-ratio: auto !important;
            height: 170px !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function MembershipSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF6F0' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #E8DCD3', borderTopColor: '#7B4A2E', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
