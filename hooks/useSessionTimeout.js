import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
const EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click']

/**
 * useSessionTimeout
 * Logs out admin after 15 minutes of inactivity.
 * Resets the timer on any user activity.
 */
export function useSessionTimeout(enabled = true) {
  const router = useRouter()
  const timerRef = useRef(null)

  const logout = useCallback(() => {
    localStorage.removeItem('cc_token')
    localStorage.removeItem('cc_role')
    localStorage.removeItem('cc_staff_id')
    localStorage.removeItem('cc_login_time')
    router.replace('/?session=expired')
  }, [router])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(logout, TIMEOUT_MS)
  }, [logout])

  useEffect(() => {
    if (!enabled) return

    // Start the timer immediately
    resetTimer()

    // Reset on any user activity
    EVENTS.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      EVENTS.forEach(evt => window.removeEventListener(evt, resetTimer))
    }
  }, [enabled, resetTimer])
}
