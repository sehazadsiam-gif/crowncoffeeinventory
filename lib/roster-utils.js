/**
 * lib/roster-utils.js
 * Standard 12-Hour AM/PM Time Formatting & Roster Utilities
 */

/**
 * Normalizes any time string (e.g. '08:00:00', '13:00:00', '1:00 PM', '8:00 AM', 'OFF')
 * into clean 12-hour AM/PM display string ('8:00 AM', '11:00 AM', '1:00 PM', '5:00 PM', 'OFF').
 */
export function normalizeShiftTime(timeStr, isOff = false) {
  if (isOff || !timeStr || timeStr === 'OFF') return 'OFF'
  const str = String(timeStr).trim().toUpperCase()
  if (str === 'OFF') return 'OFF'

  let [hStr, mStr] = str.replace(/(AM|PM)/g, '').trim().split(':')
  let h = parseInt(hStr, 10)
  let m = parseInt(mStr || '0', 10)
  if (isNaN(h)) return 'OFF'

  if (str.includes('PM') && h < 12) h += 12
  if (str.includes('AM') && h === 12) h = 0

  if (h === 8 && m === 0) return '8:00 AM'
  if (h === 11 && m === 0) return '11:00 AM'
  if ((h === 13 || h === 1) && m === 0) return '1:00 PM'
  if ((h === 17 || h === 5) && m === 0) return '5:00 PM'

  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  const displayM = String(m).padStart(2, '0')
  return `${displayH}:${displayM} ${period}`
}

/**
 * Converts any 12-hour or 24-hour time string into Postgres TIME format 'HH:MM:SS'.
 */
export function formatTo24HourTime(str) {
  if (!str || str === 'OFF') return { time: '08:00:00', isOff: true }
  let s = String(str).trim().toUpperCase()
  if (s === 'OFF') return { time: '08:00:00', isOff: true }

  const isPM = s.includes('PM')
  const isAM = s.includes('AM')
  s = s.replace(/(AM|PM)/g, '').trim()

  let [hStr, mStr] = s.split(':')
  let h = parseInt(hStr, 10)
  let m = parseInt(mStr || '0', 10)

  if (isNaN(h)) return { time: '08:00:00', isOff: false }
  if (isNaN(m)) m = 0

  if (isPM && h < 12) h += 12
  if (isAM && h === 12) h = 0

  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return { time: `${hh}:${mm}:00`, isOff: false }
}
