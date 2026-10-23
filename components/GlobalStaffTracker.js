'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * GlobalStaffTracker
 * Automatically maintains background GPS streaming on staff mobile/tablet devices
 * whenever any page is active, responding dynamically to login events, pathname changes,
 * and crown_tracking_activated broadcasts.
 */
export default function GlobalStaffTracker() {
  const pathname = usePathname()
  const watchIdRef = useRef(null)
  const heartbeatTimerRef = useRef(null)
  const activeStaffIdRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return

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

    // 2. Queue offline logs if disconnected
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

    window.addEventListener('online', flushOfflineQueue)

    // 3. Coordinate dispatcher
    const sendCoords = async (pos, staffId) => {
      const currentStaffId = staffId || localStorage.getItem('cc_staff_id')
      if (!currentStaffId) return

      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const speed = pos.coords.speed || 0

      // Adaptive throttle: 15s if moving fast (>2m/s), 30s walking (>0.4m/s), 60s stationary
      let nextInterval = 60000
      if (speed > 2.0) {
        nextInterval = 15000
      } else if (speed > 0.4) {
        nextInterval = 30000
      }

      const payload = {
        staffId: currentStaffId,
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
      heartbeatTimerRef.current = setTimeout(() => requestPing(currentStaffId), nextInterval)
    }

    const requestPing = (staffId) => {
      const currentStaffId = staffId || localStorage.getItem('cc_staff_id')
      if (!currentStaffId) return

      navigator.geolocation.getCurrentPosition(
        (pos) => sendCoords(pos, currentStaffId),
        (err) => {
          // If high accuracy times out, try standard accuracy
          navigator.geolocation.getCurrentPosition(
            (pos) => sendCoords(pos, currentStaffId),
            (fallbackErr) => console.warn('[AutoGPS] Ping fallback notice:', fallbackErr.message),
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
          )
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
      )
    }

    const startTracking = (forcedStaffId = null) => {
      const staffId = forcedStaffId || localStorage.getItem('cc_staff_id') || localStorage.getItem('staffPortalId')
      const role = localStorage.getItem('cc_role')

      // Only track staff members, never super_admin or admin
      if (!staffId || role === 'super_admin' || role === 'admin') {
        stopTracking()
        return
      }

      if (activeStaffIdRef.current === staffId && watchIdRef.current !== null) {
        // Already actively tracking this staff member
        return
      }

      activeStaffIdRef.current = staffId

      // Initial ping
      requestPing(staffId)

      // Clear previous watch if any
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }

      try {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => sendCoords(pos, staffId),
          (err) => {
            console.warn('[AutoGPS] Watch warning:', err.message)
            // Retry watch with standard accuracy if high accuracy failed
            if (err.code !== 1 && watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current)
              watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => sendCoords(pos, staffId),
                () => {},
                { enableHighAccuracy: false, maximumAge: 30000, timeout: 25000 }
              )
            }
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        )
      } catch (e) {
        console.warn('[AutoGPS] Watch setup failed:', e)
      }
    }

    const stopTracking = () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (heartbeatTimerRef.current) {
        clearTimeout(heartbeatTimerRef.current)
        heartbeatTimerRef.current = null
      }
      activeStaffIdRef.current = null
    }

    // Check & start tracking
    startTracking()

    // Listen to custom activation event triggered on login or consent
    const handleActivation = (e) => {
      const incomingId = e?.detail?.staffId || null
      startTracking(incomingId)
    }

    const handleStorageChange = () => {
      startTracking()
    }

    window.addEventListener('crown_tracking_activated', handleActivation)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('online', flushOfflineQueue)
      window.removeEventListener('crown_tracking_activated', handleActivation)
      window.removeEventListener('storage', handleStorageChange)
      stopTracking()
    }
  }, [pathname])

  return null // Headless background worker
}
