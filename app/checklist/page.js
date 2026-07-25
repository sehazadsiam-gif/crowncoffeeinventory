'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ChecklistRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/checklist/equipment')
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0F172A',
      color: 'white',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '3px solid rgba(212, 147, 58, 0.3)',
          borderTopColor: '#D4933A',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#94A3B8' }}>Opening Crown Coffee Check-List…</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
