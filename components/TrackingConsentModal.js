'use client'

import { useState } from 'react'
import { MapPin, Shield, CheckCircle2, AlertCircle } from 'lucide-react'

export default function TrackingConsentModal({ staffId, onConsented = () => {} }) {
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const handleAccept = async () => {
    setSubmitting(true)
    setErrorMsg(null)

    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your device/browser.')
      setSubmitting(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch('/api/staff/tracking-consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              staffId,
              consented: true,
              deviceInfo: navigator.userAgent
            })
          })

          const data = await res.json()
          if (data.success) {
            // Also send initial location
            await fetch('/api/staff/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                staffId,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                speed: pos.coords.speed,
                heading: pos.coords.heading,
                altitude: pos.coords.altitude,
                trackingMode: 'foreground'
              })
            })
            onConsented()
          } else {
            setErrorMsg(data.error || 'Failed to record consent.')
          }
        } catch (err) {
          setErrorMsg(err.message || 'Network error.')
        } finally {
          setSubmitting(false)
        }
      },
      (err) => {
        setSubmitting(false)
        if (err.code === 1) {
          setErrorMsg(
            'Location permission was denied. Please allow location access in your browser/phone settings to use the Crown Coffee Staff Portal.'
          )
        } else {
          setErrorMsg(`Unable to retrieve location: ${err.message}`)
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(11, 15, 25, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '20px',
          maxWidth: '460px',
          width: '100%',
          padding: '28px 24px',
          color: '#FFFFFF',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'rgba(16, 124, 65, 0.15)',
            border: '1px solid rgba(16, 124, 65, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px'
          }}
        >
          <MapPin size={28} color="#107C41" />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: '#FFFFFF' }}>
          24/7 Location Monitoring Consent
        </h2>
        <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.5, marginBottom: '18px' }}>
          Crown Coffee HR Management Policy requires active 24/7 location tracking for team coordination, safety, and automated attendance verification.
        </div>

        <div
          style={{
            background: '#1E293B',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '12px',
            color: '#E2E8F0',
            lineHeight: 1.6,
            marginBottom: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Always-On HR Monitoring:</strong> Your GPS location is shared with management while using this portal / app.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Automated Cafe Geofencing:</strong> Arrival at the cafe is automatically detected.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <Shield size={16} color="#3B82F6" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Security & Protection:</strong> All location logs are securely stored on Crown Coffee private servers.
            </span>
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12px',
              color: '#FCA5A5',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
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
            borderRadius: '12px',
            padding: '14px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(16, 124, 65, 0.4)'
          }}
        >
          {submitting ? 'Requesting GPS Permission...' : 'Allow Location & Continue'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748B', marginTop: '12px' }}>
          By continuing, you agree to Crown Coffee HR Employee Monitoring Terms.
        </div>
      </div>
    </div>
  )
}
