import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes inactivity timeout

const EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click']

/**
 * useSessionTimeout
 * Logs out admin/sub-admin after 10 minutes of inactivity.
 * Resets the timer on any active user interaction.
 */
export function useSessionTimeout(enabled = true, customTimeoutMs = TIMEOUT_MS) {
  const router = useRouter()
  const timerRef = useRef(null)

  const logout = useCallback(() => {
    localStorage.removeItem('cc_token')
    localStorage.removeItem('cc_role')
    localStorage.removeItem('cc_username')
    localStorage.removeItem('cc_staff_id')
    localStorage.removeItem('cc_login_time')
    document.cookie = 'cc_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.replace('/admin/login?session=expired')
  }, [router])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(logout, customTimeoutMs)
  }, [logout, customTimeoutMs])

  useEffect(() => {
    if (!enabled) return

    // Start the 10-minute timer
    resetTimer()

    // Reset on any user activity
    EVENTS.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      EVENTS.forEach(evt => window.removeEventListener(evt, resetTimer))
    }
  }, [enabled, resetTimer])
}
