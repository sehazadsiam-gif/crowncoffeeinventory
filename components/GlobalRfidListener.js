'use client'

import { useEffect } from 'react'
import { useToast } from './Toast'

/**
 * GlobalRfidListener
 * 
 * Captures RFID card scans across ANY page in ccadmin.online,
 * records attendance in real-time, and displays a toast notification.
 * 
 * Bypasses form inputs so it doesn't interfere when typing into input fields.
 */
export default function GlobalRfidListener() {
  const toast = useToast()

  useEffect(() => {
    let buffer = ''
    let lastKeyTime = Date.now()

    async function handleCheckin(cardCode) {
      try {
        const res = await fetch('/api/attendance/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cardCode, source: 'rfid' })
        })

        const data = await res.json()

        if (res.ok && data.success) {
          const staffName = data.staff?.name || 'Staff'
          const action = (data.action === 'checkin' ? 'Check-In' : data.action === 'checkout' ? 'Check-Out' : 'Attendance')
          const time = data.record?.check_in || data.record?.check_out || ''
          toast?.addToast(`✅ ${staffName} - ${action} Successful (${time})`, 'success')
        } else if (data.blocked) {
          const staffName = data.staff?.name || 'Staff'
          toast?.addToast(`⚠️ ${staffName} has already completed attendance today.`, 'warning')
        } else if (data.error) {
          toast?.addToast(`❌ RFID Error: ${data.error}`, 'error')
        }
      } catch (err) {
        console.error('[GlobalRfidListener] Checkin failed:', err)
        toast?.addToast(`❌ Connection Error during RFID check-in`, 'error')
      }
    }

    function onKeyDown(e) {
      const activeEl = document.activeElement
      const tag = activeEl?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || activeEl?.isContentEditable

      // Do not capture if typing inside form inputs
      if (isInput) return

      const now = Date.now()
      // RFID scanners send characters rapidly (< 150ms apart)
      if (now - lastKeyTime > 150) {
        buffer = ''
      }
      lastKeyTime = now

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault()
          const code = buffer.trim()
          buffer = ''
          handleCheckin(code)
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toast])

  return null
}
