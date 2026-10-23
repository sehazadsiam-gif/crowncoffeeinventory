'use client'

import { useState } from 'react'
import { Shield, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'

export default function TrackingConsentModal({ staffId, staffName = '', onConsented = () => {} }) {
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [isDenied, setIsDenied] = useState(false)

  const handleAccept = () => {
    setSubmitting(true)
    setErrorMsg(null)
    setIsDenied(false)

    if (typeof window === 'undefined' || !navigator.geolocation) {
      recordConsentAndProceed()
      return
    }

    let batteryLevel = null
    let isCharging = false
    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        batteryLevel = Math.round(battery.level * 100)
        isCharging = battery.charging
      }).catch(() => {})
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
                altitude: pos.coords.altitude || null,
                batteryLevel,
                isCharging,
                trackingMode: 'login_consent'
              })
            }).catch(() => null)

            try {
              localStorage.setItem('cc_tracking_consented', 'true')
              localStorage.setItem('cc_tracking_session', Date.now().toString())
              localStorage.setItem('cc_last_pos_at', new Date().toISOString())
            } catch (e) {}

            window.dispatchEvent(
              new CustomEvent('crown_tracking_activated', {
                detail: { staffId, lat: pos.coords.latitude, lng: pos.coords.longitude }
              })
            )

            onConsented(pos)
          } catch (err) {
            onConsented(pos)
          } finally {
            setSubmitting(false)
          }
        },
        async (err) => {
          if (highAccuracy && (err.code === 3 || err.code === 2)) {
            requestPosition(false)
            return
          }

          if (err.code === 1) { // PERMISSION_DENIED
            setIsDenied(true)
            setErrorMsg('Location permission was denied. Please allow location access in your browser or phone settings and try again.')
            setSubmitting(false)
          } else {
            recordConsentAndProceed()
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 10000 : 15000,
          maximumAge: 0
        }
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
      localStorage.setItem('cc_tracking_consented', 'true')
      localStorage.setItem('cc_tracking_session', Date.now().toString())
      window.dispatchEvent(new CustomEvent('crown_tracking_activated', { detail: { staffId } }))
    } catch (e) {}
    setSubmitting(false)
    onConsented(null)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          background: '#13110E',
          border: '1px solid rgba(201, 148, 58, 0.35)',
          borderRadius: '20px',
          maxWidth: '380px',
          width: '100%',
          padding: '28px 22px',
          color: '#FFFFFF',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'rgba(201, 148, 58, 0.15)',
            border: '1px solid rgba(201, 148, 58, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}
        >
          <Shield size={26} color="#C9943A" />
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 20px 0', color: '#FFFFFF' }}>
          Permission Required
        </h2>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '12px',
              color: '#FCA5A5',
              marginBottom: '16px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleAccept}
          disabled={submitting}
          style={{
            width: '100%',
            background: '#107C41',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: submitting ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(16, 124, 65, 0.4)',
            opacity: submitting ? 0.75 : 1
          }}
        >
          {submitting ? (
            <>
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Please wait...</span>
            </>
          ) : isDenied ? (
            <span>Try Again</span>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>I consent</span>
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
