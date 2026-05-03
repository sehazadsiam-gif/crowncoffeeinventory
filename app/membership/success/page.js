'use client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') || 'Valued Customer'
  const email = searchParams.get('email') || 'your email'

  return (
    <div style={{
      minHeight: '100vh', background: '#FAF7F2',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: 520, width: '100%', textAlign: 'center',
        animation: 'fadeInUp 0.4s ease forwards'
      }}>
        {/* CC Monogram */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          border: '3px solid #C9943A', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 24px'
        }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#C9943A', fontFamily: 'Georgia, serif', letterSpacing: '-2px' }}>CC</span>
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#6B3A2A', marginBottom: 16, letterSpacing: '-0.02em' }}>
          Application Submitted!
        </h1>

        {/* Checkmark */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Thank you message */}
        <p style={{ fontSize: 16, color: '#334155', lineHeight: 1.7, marginBottom: 8 }}>
          Thank you <strong>{name}</strong>! We have received your membership application.
        </p>
        <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7, marginBottom: 32 }}>
          We will review your application and send your membership card to <strong>{email}</strong> within 24 hours.
        </p>

        {/* Info box */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
          padding: '24px', textAlign: 'left', marginBottom: 32,
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)'
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#6B3A2A', marginBottom: 16 }}>
            What happens next:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: '#6B3A2A',
                color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0
              }}>1</div>
              <p style={{ fontSize: 14, color: '#334155', margin: 0, paddingTop: 4 }}>
                Our team reviews your application
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: '#6B3A2A',
                color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0
              }}>2</div>
              <p style={{ fontSize: 14, color: '#334155', margin: 0, paddingTop: 4 }}>
                You receive your digital membership card
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: '#6B3A2A',
                color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0
              }}>3</div>
              <p style={{ fontSize: 14, color: '#334155', margin: 0, paddingTop: 4 }}>
                Show your card number for 5% discount
              </p>
            </div>
          </div>
        </div>

        {/* Back to Home button */}
        <Link
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '14px 40px', background: '#6B3A2A', color: '#FFFFFF',
            borderRadius: 10, fontSize: 15, fontWeight: 700,
            textDecoration: 'none', transition: 'all 0.2s ease'
          }}
          id="membership-success-home"
        >
          Back to Home
        </Link>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default function MembershipSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7F2' }}>
        <div className="loader" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
