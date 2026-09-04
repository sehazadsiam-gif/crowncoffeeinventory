/**
 * lib/roster-utils.js
 * Standard 12-Hour AM/PM Time Formatting & Roster Utilities
 */

/**
 * Normalizes any time string (e.g. '08:00:00', '10:00:00', '13:00:00', '1:00 PM', '11:00 AM', 'OFF')
 * into the cafe's standard duty times: strictly '11:00 AM' or '1:00 PM' (or 'OFF').
 */
export function normalizeShiftTime(timeStr, isOff = false) {
  if (isOff || !timeStr || timeStr === 'OFF') return 'OFF'
  const str = String(timeStr).trim().toUpperCase()
  if (str === 'OFF') return 'OFF'

  if (str === '11:00 AM' || str === '11:00' || str === '11AM' || str === '11') return '11:00 AM'
  if (str === '1:00 PM' || str === '01:00 PM' || str === '13:00' || str === '13:00:00' || str === '1PM' || str === '13') return '1:00 PM'

  let [hStr] = str.replace(/(AM|PM)/g, '').trim().split(':')
  let h = parseInt(hStr, 10)
  if (isNaN(h)) return '11:00 AM'

  const isPM = str.includes('PM')
  if (isPM && h < 12) h += 12
  if (str.includes('AM') && h === 12) h = 0

  // Crown Coffee strictly operates on two duty shifts:
  // 1. Afternoon/Evening Shift: 1:00 PM (13:00)
  // 2. Morning/Opening Shift: 11:00 AM
  if (h === 1 || h >= 13) {
    return '1:00 PM'
  }
  return '11:00 AM'
}

/**
 * Converts any 12-hour or 24-hour time string into Postgres TIME format 'HH:MM:SS'.
 * Strictly returns '11:00:00' or '13:00:00'.
 */
export function formatTo24HourTime(str) {
  if (!str || str === 'OFF') return { time: '11:00:00', isOff: true }
  let s = String(str).trim().toUpperCase()
  if (s === 'OFF') return { time: '11:00:00', isOff: true }

  let [hStr] = s.replace(/(AM|PM)/g, '').trim().split(':')
  let h = parseInt(hStr, 10)
  if (isNaN(h)) return { time: '11:00:00', isOff: false }

  const isPM = s.includes('PM')
  if (isPM && h < 12) h += 12
  if (s.includes('AM') && h === 12) h = 0

  if (h === 1 || h >= 13) {
    return { time: '13:00:00', isOff: false }
  }
  return { time: '11:00:00', isOff: false }
}
