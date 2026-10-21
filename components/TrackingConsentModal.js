'use client'

import { useState } from 'react'
import { Shield, AlertCircle, Check } from 'lucide-react'

export default function TrackingConsentModal({ staffId, onConsented = () => {} }) {
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const handleAccept = () => {
    setSubmitting(true)
    setErrorMsg(null)

    if (typeof window === 'undefined' || !navigator.geolocation) {
      recordConsentAndProceed()
      return
    }

    const requestPosition = (highAccuracy = true) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await fetch('/api/staff/tracking-consent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                staffId,
                consented: true,
                deviceInfo: navigator.userAgent
              })
            })

            // Send initial coordinates
            await fetch('/api/staff/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                staffId,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                speed: pos.coords.speed || 0,
                heading: pos.coords.heading || 0,
                trackingMode: 'foreground'
              })
            }).catch(() => {})

            onConsented()
          } catch (err) {
            onConsented()
          } finally {
            setSubmitting(false)
          }
        },
        async (err) => {
          // If high accuracy times out or fails, retry immediately with standard accuracy
          if (highAccuracy) {
            requestPosition(false)
            return
          }

          if (err.code === 1) { // PERMISSION_DENIED
            setErrorMsg('Permission was denied. Please allow permission in browser/device settings.')
            setSubmitting(false)
          } else {
            // If GPS times out on indoor/desktop device, proceed with consent so staff isn't blocked
            recordConsentAndProceed()
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 8000 : 12000, maximumAge: 300000 }
      )
    }

    requestPosition(true)
  }

  const recordConsentAndProceed = async () => {
    try {
      await fetch('/api/staff/tracking-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          consented: true,
          deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : ''
        })
      })
    } catch (e) {}
    setSubmitting(false)
    onConsented()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(11, 15, 25, 0.9)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '18px',
          maxWidth: '400px',
          width: '100%',
          padding: '24px 20px',
          color: '#FFFFFF',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(16, 124, 65, 0.15)',
            border: '1px solid rgba(16, 124, 65, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}
        >
          <Shield size={24} color="#107C41" />
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', color: '#FFFFFF' }}>
          Portal Permission Required
        </h2>
        <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px 0', lineHeight: 1.4 }}>
          Please grant permission to access the staff portal and enable automated attendance verification.
        </p>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12px',
              color: '#FCA5A5',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={submitting}
          style={{
            width: '100%',
            background: '#107C41',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(16, 124, 65, 0.35)'
          }}
        >
          {submitting ? 'Granting...' : 'Grant Permission & Continue'}
        </button>
      </div>
    </div>
  )
}
