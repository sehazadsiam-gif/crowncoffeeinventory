'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Battery, BatteryCharging, BatteryWarning, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function TrackingBadge({ staffId, staffName }) {
  const [lastPing, setLastPing] = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [batteryLevel, setBatteryLevel] = useState(null)
  const [isCharging, setIsCharging] = useState(false)
  const [isInsideGeofence, setIsInsideGeofence] = useState(false)
  const [errorStatus, setErrorStatus] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const watchIdRef = useRef(null)

  // Battery status API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        const updateBattery = () => {
          setBatteryLevel(Math.round(battery.level * 100))
          setIsCharging(battery.charging)
        }
        updateBattery()
        battery.addEventListener('levelchange', updateBattery)
        battery.addEventListener('chargingchange', updateBattery)
      }).catch(() => {})
    }
  }, [])

  // Seconds ago counter
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastPing) {
        const sec = Math.floor((new Date().getTime() - lastPing.getTime()) / 1000)
        setSecondsAgo(sec)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [lastPing])

  // Continuous GPS Reporter
  useEffect(() => {
    if (!staffId || typeof window === 'undefined' || !navigator.geolocation) return

    const sendCoords = async (pos) => {
      try {
        const res = await fetch('/api/staff/location', {
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
            batteryLevel,
            isCharging,
            trackingMode: 'foreground'
          })
        })
        const data = await res.json()
        if (data.success) {
          setLastPing(new Date())
          setIsInsideGeofence(data.isInsideGeofence || false)
          setErrorStatus(null)
          setIsTracking(true)
        }
      } catch (e) {
        console.error('[TrackingBadge] Send error:', e)
      }
    }

    const reportCurrentPosition = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendCoords(pos),
        (err) => {
          setErrorStatus(err.message)
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
    }

    // Initial ping
    reportCurrentPosition()

    // Watch position
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => sendCoords(pos),
        (err) => {
          console.warn('[TrackingBadge] watchPosition warning:', err.message)
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      )
    } catch (e) {
      console.error(e)
    }

    // Periodic 30s heartbeat fallback
    const interval = setInterval(reportCurrentPosition, 30000)

    return () => {
      clearInterval(interval)
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [staffId, batteryLevel, isCharging])

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        background: errorStatus ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 124, 65, 0.1)',
        border: errorStatus ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 124, 65, 0.25)',
        borderRadius: '999px',
        padding: '6px 14px',
        fontSize: '12px',
        color: errorStatus ? '#EF4444' : '#107C41',
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: errorStatus ? '#EF4444' : '#10B981',
            boxShadow: errorStatus
              ? '0 0 6px rgba(239, 68, 68, 0.8)'
              : '0 0 6px rgba(16, 185, 129, 0.8)'
          }}
        ></span>
        <span>
          {errorStatus ? 'GPS Inactive (Check Phone Settings)' : '24/7 Live Tracking Active'}
        </span>
      </div>

      {isTracking && (
        <>
          <span style={{ color: '#94A3B8' }}>•</span>
          <span style={{ color: '#64748B', fontSize: '11px' }}>
            {lastPing ? `${secondsAgo}s ago` : 'Connecting...'}
          </span>
        </>
      )}

      {isInsideGeofence && (
        <>
          <span style={{ color: '#94A3B8' }}>•</span>
          <span
            style={{
              background: '#107C41',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px'
            }}
          >
            ☕ At Cafe
          </span>
        </>
      )}

      {batteryLevel !== null && (
        <>
          <span style={{ color: '#94A3B8' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#64748B', fontSize: '11px' }}>
            {isCharging ? (
              <BatteryCharging size={13} color="#107C41" />
            ) : batteryLevel < 20 ? (
              <BatteryWarning size={13} color="#EF4444" />
            ) : (
              <Battery size={13} />
            )}
            {batteryLevel}%
          </span>
        </>
      )}
    </div>
  )
}
