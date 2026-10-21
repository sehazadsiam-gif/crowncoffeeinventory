'use client'

import { useEffect, useRef } from 'react'

/**
 * GlobalStaffTracker
 * Automatically and silently starts background GPS streaming on staff mobile devices
 * whenever any page is loaded, as long as staff is logged in (cc_staff_id in localStorage).
 * No button click required.
 */
export default function GlobalStaffTracker() {
  const watchIdRef = useRef(null)
  const heartbeatTimerRef = useRef(null)
  const isTrackingRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return

    // Check if device belongs to an employee
    const staffId = localStorage.getItem('cc_staff_id')
    const role = localStorage.getItem('cc_role')

    // Only run if staffId is present and not super admin
    if (!staffId || role === 'super_admin') return

    let batteryLevel = null
    let isCharging = false

    // 1. Read battery status if available
    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        batteryLevel = Math.round(battery.level * 100)
        isCharging = battery.charging
        battery.addEventListener('levelchange', () => {
          batteryLevel = Math.round(battery.level * 100)
        })
        battery.addEventListener('chargingchange', () => {
          isCharging = battery.charging
        })
      }).catch(() => {})
    }

    // 2. Queue offline logs if cellular is disconnected
    const queueOfflinePing = (payload) => {
      try {
        const raw = localStorage.getItem('crown_offline_gps_pings')
        const queue = raw ? JSON.parse(raw) : []
        queue.push(payload)
        if (queue.length > 50) queue.shift()
        localStorage.setItem('crown_offline_gps_pings', JSON.stringify(queue))
      } catch (e) {}
    }

    const flushOfflineQueue = async () => {
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
        }
      } catch (e) {}
    }

    // Flush whenever device comes back online
    window.addEventListener('online', flushOfflineQueue)

    // 3. Send coordinate payload to 24/7 staff radar
    const sendCoords = async (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const speed = pos.coords.speed || 0

      // Adaptive throttle: 15s if moving fast, 30s walking, 60s stationary
      let nextInterval = 60000
      if (speed > 2.0) {
        nextInterval = 15000
      } else if (speed > 0.4) {
        nextInterval = 30000
      }

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
        trackingMode: 'background_auto',
        recordedAt: new Date().toISOString()
      }

      if (!navigator.onLine) {
        queueOfflinePing(payload)
      } else {
        try {
          const res = await fetch('/api/staff/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          if (!res.ok) {
            queueOfflinePing(payload)
          } else {
            flushOfflineQueue()
          }
        } catch (err) {
          queueOfflinePing(payload)
        }
      }

      // Schedule next position check
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current)
      heartbeatTimerRef.current = setTimeout(requestPing, nextInterval)
    }

    const requestPing = () => {
      navigator.geolocation.getCurrentPosition(
        sendCoords,
        (err) => console.warn('[AutoGPS] Error:', err.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      )
    }

    // 4. Start auto-tracking immediately
    requestPing()

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        sendCoords,
        (err) => console.warn('[AutoGPS] Watch warning:', err.message),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      )
      isTrackingRef.current = true
    } catch (e) {
      console.warn('[AutoGPS] Watch failed:', e)
    }

    return () => {
      window.removeEventListener('online', flushOfflineQueue)
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current)
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return null // Headless background worker
}
