'use client'

import { useState, useEffect, useRef } from 'react'
import {
  MapPin,
  Battery,
  BatteryCharging,
  BatteryWarning,
  CheckCircle2,
  AlertTriangle,
  Radio,
  WifiOff,
  ShieldAlert,
  PhoneCall,
  MessageCircle,
  X,
  Users
} from 'lucide-react'
import { createWhatsAppLink } from '../lib/whatsapp-client'

export default function TrackingBadge({ staffId, staffName }) {
  const [lastPing, setLastPing] = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [batteryLevel, setBatteryLevel] = useState(null)
  const [isCharging, setIsCharging] = useState(false)
  const [isInsideGeofence, setIsInsideGeofence] = useState(false)
  const [errorStatus, setErrorStatus] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const [motionMode, setMotionMode] = useState('stationary') // 'stationary' (90s) | 'walking' (30s) | 'vehicle' (15s)
  const [offlineCount, setOfflineCount] = useState(0)
  const [currentCoords, setCurrentCoords] = useState(null)

  // Handover state
  const [handoverData, setHandoverData] = useState(null)
  const [showHandoverModal, setShowHandoverModal] = useState(false)

  // SOS state
  const [showSosModal, setShowSosModal] = useState(false)
  const [sosSending, setSosSending] = useState(false)
  const [sosSentData, setSosSentData] = useState(null)

  const watchIdRef = useRef(null)
  const heartbeatTimerRef = useRef(null)
  const lastPosRef = useRef(null)

  // Battery status API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'getBattery' in navigator) {
      navigator
        .getBattery()
        .then((battery) => {
          const updateBattery = () => {
            setBatteryLevel(Math.round(battery.level * 100))
            setIsCharging(battery.charging)
          }
          updateBattery()
          battery.addEventListener('levelchange', updateBattery)
          battery.addEventListener('chargingchange', updateBattery)
        })
        .catch(() => {})
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

  // Flush offline queue when online
  const flushOfflineQueue = async () => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('crown_offline_gps_pings')
      if (!raw) return
      const queue = JSON.parse(raw)
      if (!Array.isArray(queue) || queue.length === 0) return

      const res = await fetch('/api/staff/location/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pings: queue })
      })

      if (res.ok) {
        localStorage.removeItem('crown_offline_gps_pings')
        setOfflineCount(0)
      }
    } catch (e) {
      console.warn('[TrackingBadge] Queue flush error:', e)
    }
  }

  // Queue offline ping
  const queueOfflinePing = (pingData) => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('crown_offline_gps_pings')
      const queue = raw ? JSON.parse(raw) : []
      queue.push(pingData)
      // Keep max 100 offline pings to avoid localStorage bloat
      if (queue.length > 100) queue.shift()
      localStorage.setItem('crown_offline_gps_pings', JSON.stringify(queue))
      setOfflineCount(queue.length)
    } catch (e) {
      console.warn('[TrackingBadge] Offline cache error:', e)
    }
  }

  // Check handover relief
  const fetchHandoverStatus = async () => {
    if (!staffId) return
    try {
      const res = await fetch(`/api/attendance/handover-check?staffId=${staffId}`)
      const data = await res.json()
      if (data.success) {
        setHandoverData(data)
      }
    } catch (err) {
      console.warn('[HandoverCheck]', err)
    }
  }

  useEffect(() => {
    fetchHandoverStatus()
    // Poll relief handover status every 2 minutes
    const hInterval = setInterval(fetchHandoverStatus, 120000)
    return () => clearInterval(hInterval)
  }, [staffId])

  // Continuous GPS Reporter with Smart Adaptive Throttle & Offline Caching
  useEffect(() => {
    if (!staffId || typeof window === 'undefined' || !navigator.geolocation) return

    // Network online listener
    const onOnline = () => {
      flushOfflineQueue()
    }
    window.addEventListener('online', onOnline)

    const sendCoords = async (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const speed = pos.coords.speed || 0 // m/s
      setCurrentCoords({ latitude: lat, longitude: lng })

      // Determine motion mode & adaptive heartbeat
      let mode = 'stationary'
      let nextInterval = 90000 // 90s for stationary
      if (speed > 2.0) {
        mode = 'vehicle'
        nextInterval = 15000 // 15s for vehicle
      } else if (speed > 0.3) {
        mode = 'walking'
        nextInterval = 30000 // 30s for walking
      }
      setMotionMode(mode)

      const payload = {
        staffId,
        latitude: lat,
        longitude: lng,
        accuracy: pos.coords.accuracy,
        speed,
        heading: pos.coords.heading,
        altitude: pos.coords.altitude,
        batteryLevel,
        isCharging,
        trackingMode: 'foreground',
        recordedAt: new Date().toISOString()
      }

      // Check offline
      if (!navigator.onLine) {
        queueOfflinePing(payload)
        setErrorStatus('Offline: Caching GPS locally')
        return
      }

      try {
        const res = await fetch('/api/staff/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        const data = await res.json()
        if (data.success) {
          setLastPing(new Date())
          setIsInsideGeofence(data.isInsideGeofence || false)
          setErrorStatus(null)
          setIsTracking(true)

          // Flush any pending queue
          flushOfflineQueue()
        } else {
          queueOfflinePing(payload)
        }
      } catch (e) {
        console.error('[TrackingBadge] Send error:', e)
        queueOfflinePing(payload)
        setErrorStatus('Network error: Queued offline')
      }

      // Schedule next adaptive heartbeat
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current)
      heartbeatTimerRef.current = setTimeout(reportCurrentPosition, nextInterval)
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

    return () => {
      window.removeEventListener('online', onOnline)
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current)
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [staffId, batteryLevel, isCharging])

  // Trigger Emergency SOS Panic Button
  const handleTriggerSos = async () => {
    if (!staffId || !currentCoords) {
      alert('Unable to get your current GPS location. Please ensure location permissions are enabled.')
      return
    }

    setSosSending(true)
    try {
      const res = await fetch('/api/staff/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          batteryLevel,
          notes: 'Emergency SOS triggered from staff portal'
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSosSentData(data)
      } else {
        alert('Failed to send SOS: ' + (data.error || 'Server error'))
      }
    } catch (err) {
      alert('SOS send error: ' + err.message)
    } finally {
      setSosSending(false)
    }
  }

  return (
    <>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #E2E8F0',
          borderRadius: '999px',
          padding: '4px 12px',
          fontSize: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)'
        }}
      >
        {/* Live Status indicator */}
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
          <span style={{ fontWeight: 700, color: errorStatus ? '#DC2626' : '#107C41' }}>
            {errorStatus ? errorStatus : '24/7 Radar Active'}
          </span>
        </div>

        {/* Adaptive Motion Mode */}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: '4px',
            background: motionMode === 'vehicle' ? '#FEF3C7' : motionMode === 'walking' ? '#E0F2FE' : '#F1F5F9',
            color: motionMode === 'vehicle' ? '#B45309' : motionMode === 'walking' ? '#0369A1' : '#475569'
          }}
          title={`Adaptive ping frequency: ${motionMode === 'vehicle' ? '15s (Vehicle)' : motionMode === 'walking' ? '30s (Walking)' : '90s (Stationary)'}`}
        >
          {motionMode}
        </span>

        {/* Ping recency */}
        {isTracking && (
          <span style={{ color: '#64748B', fontSize: '11px' }}>
            {lastPing ? `${secondsAgo}s ago` : 'Connecting...'}
          </span>
        )}

        {/* Offline cached badge */}
        {offlineCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              background: '#FEF2F2',
              color: '#DC2626',
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px'
            }}
          >
            <WifiOff size={10} /> {offlineCount} cached
          </span>
        )}

        {/* Cafe Geofence Status */}
        {isInsideGeofence && (
          <span
            style={{
              background: '#107C41',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '4px'
            }}
          >
            ☕ At Cafe
          </span>
        )}

        {/* Battery & Charging */}
        {batteryLevel !== null && (
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
        )}

        {/* Handover Proximity Pill */}
        {handoverData && (
          <button
            onClick={() => setShowHandoverModal(true)}
            style={{
              border: 'none',
              background: handoverData.canHandover ? '#ECFDF5' : '#FFFBEB',
              color: handoverData.canHandover ? '#065F46' : '#B45309',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Check shift handover status"
          >
            <Users size={12} />
            {handoverData.canHandover ? 'Relief On-Site' : 'No Relief Inside'}
          </button>
        )}

        {/* SOS Panic Button */}
        <button
          onClick={() => setShowSosModal(true)}
          style={{
            background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '999px',
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)'
          }}
          title="Emergency Panic Button"
        >
          <ShieldAlert size={12} />
          <span>SOS</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SHIFT HANDOVER PROXIMITY MODAL                            */}
      {/* ========================================================= */}
      {showHandoverModal && handoverData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} color="#107C41" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Shift Handover Check</h3>
              </div>
              <button
                onClick={() => setShowHandoverModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
              {handoverData.message}
            </p>

            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase' }}>
                Colleagues Inside Cafe Right Now ({handoverData.staffInsideCount}):
              </div>
              {handoverData.staffInsideCafe.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#DC2626', fontWeight: 600 }}>
                  ⚠️ No incoming or relief colleagues detected inside the cafe boundary. Please notify the floor manager before departing.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {handoverData.staffInsideCafe.map((colleague) => (
                    <div
                      key={colleague.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>{colleague.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{colleague.designation || colleague.department || 'Staff'}</div>
                      </div>
                      <span
                        style={{
                          background: '#ECFDF5',
                          color: '#065F46',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px'
                        }}
                      >
                        ✓ Inside Cafe
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowHandoverModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#107C41',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EMERGENCY SOS PANIC MODAL                                 */}
      {/* ========================================================= */}
      {showSosModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              textAlign: 'center'
            }}
          >
            {!sosSentData ? (
              <>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#FEF2F2',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: '0 0 0 8px rgba(220, 38, 38, 0.15)'
                  }}
                >
                  <ShieldAlert size={36} />
                </div>

                <h3 style={{ fontSize: '22px', fontWeight: 900, color: '#111827', margin: '0 0 8px' }}>
                  Emergency SOS Alert
                </h3>
                <p style={{ fontSize: '14px', color: '#4B5563', margin: '0 0 24px', lineHeight: 1.5 }}>
                  Are you in distress or need immediate assistance? Tapping confirm will broadcast your
                  <strong> exact live GPS coordinates</strong> to Crown Coffee management and emergency contacts.
                </p>

                {currentCoords && (
                  <div
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '10px',
                      padding: '10px',
                      fontSize: '12px',
                      color: '#374151',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <MapPin size={14} color="#DC2626" />
                    <span>
                      GPS: {currentCoords.latitude.toFixed(5)}, {currentCoords.longitude.toFixed(5)} · Battery:{' '}
                      {batteryLevel !== null ? `${batteryLevel}%` : 'N/A'}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={handleTriggerSos}
                    disabled={sosSending}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)'
                    }}
                  >
                    {sosSending ? 'Broadcasting SOS...' : '🚨 CONFIRM EMERGENCY SOS'}
                  </button>

                  <button
                    onClick={() => setShowSosModal(false)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#F3F4F6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#111827', margin: '0 0 8px' }}>
                  SOS Alert Broadcasted!
                </h3>
                <p style={{ fontSize: '13px', color: '#4B5563', margin: '0 0 20px', lineHeight: 1.5 }}>
                  Your live location has been logged in the management dashboard. You can also directly open WhatsApp or
                  call management below:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <a
                    href={createWhatsAppLink({
                      message: `🚨 *EMERGENCY SOS ALERT*\nI need immediate assistance!\nMy location: ${sosSentData.googleMapsUrl}`
                    })}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      background: '#25D366',
                      color: 'white',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <MessageCircle size={18} />
                    <span>Open WhatsApp Message</span>
                  </a>

                  <a
                    href="tel:01712345678"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      background: '#DC2626',
                      color: 'white',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <PhoneCall size={18} />
                    <span>Direct Emergency Call</span>
                  </a>
                </div>

                <button
                  onClick={() => {
                    setSosSentData(null)
                    setShowSosModal(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#E5E7EB',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
