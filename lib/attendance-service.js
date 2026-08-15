/**
 * lib/attendance-service.js
 *
 * ─────────────────────────────────────────────────────────────────────
 * STANDALONE ATTENDANCE LOGGING SERVICE
 *
 * This is the SINGLE source of truth for recording attendance.
 * Every entry point calls logAttendance() — QR scan, manual admin entry,
 * and future biometric/RFID devices are all drop-in callers of this one function.
 *
 * To integrate a new device: create one new API route that validates the
 * device's payload, maps it to { staff_id | employee_id, timestamp, source },
 * and calls logAttendance(). Nothing else changes.
 * ─────────────────────────────────────────────────────────────────────
 */

import { supabaseAdmin } from './supabase.js'
import nodemailer from 'nodemailer'
import { sendWhatsAppNotification } from './whatsapp.js'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.GMAIL_USER

// In-memory 60s tap debounce guard
const lastTapMap = new Map()

// ── Email transporter (reuse existing Gmail setup) ────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Robustly extract Bangladesh Standard Time (Asia/Dhaka, UTC+6) hour and minute.
 */
export function getDhakaHourAndMinute(date = new Date()) {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  })
  const parts = formatter.formatToParts(d)
  let hour = 0
  let minute = 0
  parts.forEach(p => {
    if (p.type === 'hour') {
      let h = parseInt(p.value.replace(/\D/g, ''), 10)
      if (h === 24) h = 0
      hour = h % 24
    }
    if (p.type === 'minute') {
      minute = parseInt(p.value.replace(/\D/g, ''), 10) || 0
    }
  })
  return { hour, minute, minutesSinceMidnight: hour * 60 + minute }
}

/**
 * Parse a TIME string (HH:MM or HH:MM:SS) into minutes since midnight.
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + (m || 0)
}

/**
 * Get the Saturday of the week (Saturday -> Friday cycle) containing the given date in Bangladesh Time.
 */
function getSaturdayOf(dateStrOrObj) {
  const dateStr = typeof dateStrOrObj === 'string'
    ? dateStrOrObj
    : new Date(dateStrOrObj).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
  const [y, m, d] = dateStr.split('-').map(Number)
  const dateInDhaka = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const day = dateInDhaka.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = (day === 6 ? 0 : -(day + 1))
  dateInDhaka.setUTCDate(dateInDhaka.getUTCDate() + diff)
  return dateInDhaka.toISOString().split('T')[0]
}
function getMondayOf(date) {
  return getSaturdayOf(date)
}

/**
 * Resolve a staff record by either UUID (staff_id) or employee_id string (e.g. "CC-001").
 * Returns the full staff row or null.
 */
async function resolveStaff(identifier) {
  if (!identifier) return null
  const cleanId = String(identifier).trim()

  // Try UUID first
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)
  if (isUUID) {
    const { data } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('id', cleanId)
      .eq('is_active', true)
      .maybeSingle()
    if (data) return data
  }

  // Build all RFID variants to try:
  // - exact as received (e.g. "0007149106")
  // - stripped of leading zeros (e.g. "7149106")
  // - zero-padded to 10 digits (e.g. "0007149106")
  const stripped = cleanId.replace(/^0+/, '') || '0'  // never empty
  const padded10 = stripped.padStart(10, '0')
  const upper = cleanId.toUpperCase()
  const strippedUpper = stripped.toUpperCase()

  // Deduplicate variants
  const rfidVariants = [...new Set([cleanId, upper, stripped, strippedUpper, padded10])]

  // Try employee_id match first, then each rfid variant
  const orConditions = [
    `employee_id.eq.${upper}`,
    ...rfidVariants.map(v => `rfid_code.eq.${v}`)
  ]

  const { data } = await supabaseAdmin
    .from('staff')
    .select('*')
    .eq('is_active', true)
    .or(orConditions.join(','))
    .maybeSingle()

  if (data) return data

  // Last resort: fetch all staff and do a numeric comparison
  // This handles cases where DB stores "0007149106" but reader sends "7149106"
  if (/^\d+$/.test(stripped)) {
    const numericVal = parseInt(stripped, 10)
    const { data: allStaff } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('is_active', true)
      .not('rfid_code', 'is', null)

    const match = (allStaff || []).find(s => {
      const stored = String(s.rfid_code || '').trim().replace(/^0+/, '') || '0'
      return parseInt(stored, 10) === numericVal
    })
    if (match) return match
  }

  return null
}

/**
 * Get the roster entry for a staff member on a given date.
 * Falls back to staff.shift_start and staff.weekly_off if no roster row exists.
 */
async function getRosterForDate(staffId, dateStr) {
  // ── Business Rule: Friday is NEVER a day off for any staff ──────────────────
  const dateCheck = new Date(dateStr)
  const dayNameCheck = dateCheck.toLocaleDateString('en-US', { weekday: 'long' })
  const isFriday = dayNameCheck.toLowerCase() === 'friday'

  // Check duty_roster table first
  const { data: rosterEntry } = await supabaseAdmin
    .from('duty_roster')
    .select('*')
    .eq('staff_id', staffId)
    .eq('day_date', dateStr)
    .single()

  if (rosterEntry) {
    return {
      shift_start: rosterEntry.shift_start,
      is_off: isFriday ? false : rosterEntry.is_off,   // Friday override
      is_leave: isFriday ? false : rosterEntry.is_leave, // Friday override
      shift_hours: rosterEntry.shift_hours || 10,
      source: 'roster'
    }
  }

  // Fall back to staff defaults
  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('shift_start, weekly_off, grace_minutes')
    .eq('id', staffId)
    .single()

  if (!staff) return null

  const date = new Date(dateStr)
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  // Friday is never a day off, even if weekly_off is set to Friday
  const isOff = !isFriday && staff.weekly_off && dayName.toLowerCase() === staff.weekly_off.toLowerCase()

  return {
    shift_start: staff.shift_start || '08:00',
    is_off: isOff,
    is_leave: false,
    shift_hours: 10,
    grace_minutes: staff.grace_minutes || 15,
    source: 'default'
  }
}

// ── Email Alerts ──────────────────────────────────────────────────────────────

async function sendLateAlert(staff, minutesLate, checkInTime, dateStr) {
  // ── Telegram Instant Alert (Optional via TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID) ──
  const tgToken = process.env.TELEGRAM_BOT_TOKEN
  const tgChatId = process.env.TELEGRAM_CHAT_ID
  if (tgToken && tgChatId) {
    try {
      const msg = `⚠️ *LATE ARRIVAL ALERT*\n\n` +
        `👤 *Staff:* ${staff.name} (${staff.designation || 'Staff'})\n` +
        `🆔 *ID:* \`${staff.employee_id || 'N/A'}\`\n` +
        `⏰ *Check-in Time:* ${checkInTime} (BST)\n` +
        `🐢 *Lateness:* +${minutesLate} minutes late\n` +
        `📅 *Date:* ${dateStr}`
      
      fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChatId, text: msg, parse_mode: 'Markdown' })
      }).catch(() => {})
    } catch (e) {
      console.error('[attendance-service] Telegram alert error:', e)
    }
  }

  if (!ADMIN_EMAIL) return
  try {
    // Check total lates this Saturday-to-Friday week
    const satDateStr = getSaturdayOf(dateStr || new Date())
    const { count: weeklyLateCount } = await supabaseAdmin
      .from('attendance_log')
      .select('id', { count: 'exact' })
      .eq('staff_id', staff.id)
      .eq('status', 'late')
      .gte('date', satDateStr)

    const is3xWarning = (weeklyLateCount || 0) >= 3
    const subjectPrefix = is3xWarning ? `⚠️ CRITICAL (3+ Late This Week):` : `Late Check-In:`

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: ADMIN_EMAIL,
      subject: `${subjectPrefix} ${staff.name} (${minutesLate} min late)`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; padding: 32px; background: #FAFAFA;">
          <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; padding: 28px; border: 1px solid #E0E0E0;">
            <div style="background: ${is3xWarning ? '#FEE2E2' : '#FFF3E0'}; border-left: 4px solid ${is3xWarning ? '#DC2626' : '#FF9800'}; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 4px; color: ${is3xWarning ? '#991B1B' : '#E65100'}; font-size: 18px;">
                ${is3xWarning ? '⚠️ 3+ Late Warning Threshold Reached!' : 'Late Arrival Alert'}
              </h2>
              <p style="margin: 0; color: ${is3xWarning ? '#991B1B' : '#BF360C'}; font-size: 13px;">
                ${is3xWarning ? `${staff.name} has been late ${weeklyLateCount} times this week!` : 'Crown Coffee Attendance System'}
              </p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 8px 0; color: #666; width: 120px;">Employee</td><td style="font-weight: 600; color: #333;">${staff.name}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">ID</td><td style="color: #333;">${staff.employee_id || '-'}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Designation</td><td style="color: #333;">${staff.designation || '-'}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Check-in Time</td><td style="color: #333;">${checkInTime}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Minutes Late</td><td style="font-weight: 700; color: #E65100;">${minutesLate} minutes</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Weekly Lates</td><td style="font-weight: 700; color: ${is3xWarning ? '#DC2626' : '#333'};">${weeklyLateCount || 1} late arrival(s) this week</td></tr>
            </table>
            <div style="margin-top: 20px; text-align: center; color: #9C8A76; font-size: 11px;">
              Crown Coffee — Attendance System
            </div>
          </div>
        </div>
      `
    })
  } catch (err) {
    console.error('[attendance-service] Late alert email failed:', err.message)
  }
}


async function sendAbsentAlert(staffList, date) {
  if (!ADMIN_EMAIL || !staffList.length) return
  try {
    const rows = staffList.map(s => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #F0F0F0;">${s.name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #F0F0F0; color: #666;">${s.employee_id || '-'}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #F0F0F0; color: #666;">${s.designation || '-'}</td>
      </tr>
    `).join('')

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: ADMIN_EMAIL,
      subject: `Absent Staff — ${date} (${staffList.length} not checked in)`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; padding: 32px; background: #FAFAFA;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 28px; border: 1px solid #E0E0E0;">
            <div style="background: #FFEBEE; border-left: 4px solid #F44336; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 4px; color: #B71C1C; font-size: 18px;">Absent Staff Alert</h2>
              <p style="margin: 0; color: #C62828; font-size: 13px;">${date} — Grace period has passed</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #F5F5F5;">
                  <th style="padding: 10px 12px; text-align: left; color: #333;">Name</th>
                  <th style="padding: 10px 12px; text-align: left; color: #333;">ID</th>
                  <th style="padding: 10px 12px; text-align: left; color: #333;">Role</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="margin-top: 20px; text-align: center; color: #9C8A76; font-size: 11px;">
              Crown Coffee — Attendance System
            </div>
          </div>
        </div>
      `
    })
  } catch (err) {
    console.error('[attendance-service] Absent alert email failed:', err.message)
  }
}

async function sendEarlyDepartureAlert(staff, hoursWorked, checkOutTime) {
  if (!ADMIN_EMAIL) return
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: ADMIN_EMAIL,
      subject: `⚠️ Early Departure Alert: ${staff.name}`,
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; padding: 32px; background: #FAFAFA;">
          <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 12px; padding: 28px; border: 1px solid #E0E0E0;">
            <div style="background: #FEF3C7; border-left: 4px solid #D97706; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 4px; color: #92400E; font-size: 18px;">Early Departure Alert</h2>
              <p style="margin: 0; color: #B45309; font-size: 13px;">Staff checked out early before full shift completion</p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 8px 0; color: #666; width: 120px;">Employee</td><td style="font-weight: 600; color: #333;">${staff.name}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">ID</td><td style="color: #333;">${staff.employee_id || '-'}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Check-out Time</td><td style="color: #333;">${checkOutTime}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Hours Worked</td><td style="font-weight: 700; color: #D97706;">${hoursWorked} hrs</td></tr>
            </table>
          </div>
        </div>
      `
    })
  } catch (err) {
    console.error('[attendance-service] Early departure alert failed:', err.message)
  }
}

// ── MAIN: logAttendance ───────────────────────────────────────────────────────

/**
 * Log a check-in event. This is the ONLY function that writes to attendance_log.
 *
 * @param {Object} params
 * @param {string} params.identifier      - staff UUID or employee_id string (e.g. "CC-001")
 * @param {string} [params.timestamp]     - ISO timestamp of check-in (defaults to now)
 * @param {string} [params.source]        - 'qr' | 'manual' | 'biometric' | 'api' (defaults to 'manual')
 * @param {string} [params.notes]         - Optional notes
 * @param {boolean} [params.adminOverride] - If true, skips classification and uses provided status
 * @param {string} [params.forceStatus]   - Used with adminOverride to set status directly
 *
 * @returns {Object} { success, status, staff, minutesLate, existing, error }
 */
export async function logAttendance({
  identifier,
  timestamp,
  source = 'manual',
  notes = '',
  adminOverride = false,
  forceStatus = null,
  enableBreak = false
}) {
  try {
    // 1. Resolve staff member
    const staff = await resolveStaff(identifier)
    if (!staff) {
      return { success: false, error: `Employee not found: ${identifier}` }
    }

    // ── Bangladesh Local Date & Time Calculation (Asia/Dhaka UTC+6) ──
    const checkInAt = timestamp ? new Date(timestamp) : new Date()
    const nowMs = checkInAt.getTime()

    // Bulletproof YYYY-MM-DD & minutes in Asia/Dhaka
    const calendarDateStr = checkInAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
    const yesterdayDate = new Date(checkInAt.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayDateStr = yesterdayDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })

    const { hour: localHour, minutesSinceMidnight: checkInMinutes } = getDhakaHourAndMinute(checkInAt)

    let dateStr = calendarDateStr
    let existing = null

    // ── 5:00 AM Business Day Reset Rule ──
    // If tapping between 00:00 AM and 04:59 AM, check if an unclosed check-in from yesterday exists first
    if (localHour < 5) {
      const { data: yesterdayLog } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('date', yesterdayDateStr)
        .maybeSingle()

      if (yesterdayLog && yesterdayLog.check_in_at && !yesterdayLog.check_out_at) {
        dateStr = yesterdayDateStr
        existing = yesterdayLog
      }
    }

    if (!existing) {
      const { data: todayLog } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('date', dateStr)
        .maybeSingle()
      existing = todayLog
    }

    // ── 5-Minute (300s) Double-Tap Cooldown Guard ──
    const tapKey = `${staff.id}_${dateStr}`
    const lastTapTime = lastTapMap.get(tapKey)
    if (lastTapTime && (checkInAt.getTime() - lastTapTime) < 300000 && !adminOverride) {
      const remainingSecs = Math.ceil((300000 - (checkInAt.getTime() - lastTapTime)) / 1000)
      return {
        success: false,
        blocked: true,
        error: `Duplicate tap ignored. Please wait ${remainingSecs}s before scanning again.`,
        staff: { id: staff.id, name: staff.name, employee_id: staff.employee_id }
      }
    }
    lastTapMap.set(tapKey, checkInAt.getTime())

    // 1. Resolve Shift Start & Rules (Independent Standalone Attendance System)
    // Shift classification is determined strictly by arrival time cutoffs:
    // - Taps before 10:30 AM (<630m) -> 8:00 AM Shift (08:00), Grace until 8:15 AM (495m)
    // - Taps between 10:30 AM & 12:30 PM (630m-750m) -> 11:00 AM Shift (11:00), Grace until 11:15 AM (675m)
    // - Taps at/after 12:30 PM (>=750m) -> 1:00 PM Shift (13:00), Grace until 1:15 PM (795m)
    let shiftStartStr = '08:00'
    let shiftStartMinutes = 8 * 60

    if (checkInMinutes >= 12 * 60 + 30) {
      shiftStartStr = '13:00'
      shiftStartMinutes = 13 * 60
    } else if (checkInMinutes >= 10 * 60 + 30) {
      shiftStartStr = '11:00'
      shiftStartMinutes = 11 * 60
    }

    const graceMinutes = 15
    const deadlineMinutes = shiftStartMinutes + graceMinutes

    let status = 'present'
    let minutesLate = 0

    if (adminOverride && forceStatus) {
      status = forceStatus
    } else if (checkInMinutes > deadlineMinutes) {
      status = 'late'
      minutesLate = checkInMinutes - shiftStartMinutes
    }

    // Tap Rules
    if (existing && existing.check_in_at && existing.check_out_at && !adminOverride) {
      return {
        success: false,
        blocked: true,
        error: 'Attendance already complete for today. Check-in and check-out both recorded.',
        staff: { id: staff.id, name: staff.name, employee_id: staff.employee_id }
      }
    }

    // Existing check-in found & not checked out yet:
    if (existing && existing.check_in_at && !existing.check_out_at && !adminOverride) {
      
      // ── Safety Cooldown Guard: Prevent double-taps within 300s (5 minutes) of check-in ──
      const initialCheckInTime = new Date(existing.check_in_at).getTime()
      const elapsedSinceCheckIn = checkInAt.getTime() - initialCheckInTime
      if (elapsedSinceCheckIn >= 0 && elapsedSinceCheckIn < 300000) {
        const remainingSecs = Math.ceil((300000 - elapsedSinceCheckIn) / 1000)
        return {
          success: false,
          blocked: true,
          error: `Check-in already recorded. Please wait ${remainingSecs}s before scanning again.`,
          staff: { id: staff.id, name: staff.name, employee_id: staff.employee_id }
        }
      }

      // ── STATE A: Currently ON BREAK (break_start_at exists, break_end_at is NULL) ──
      // Tap MUST ALWAYS END BREAK and put staff back ON DUTY. Cannot check out directly from break!
      if (existing.break_start_at && !existing.break_end_at) {
        const breakEndIso = checkInAt.toISOString()
        const breakStart = new Date(existing.break_start_at)
        const breakDurationMin = Math.max(0, Math.floor((checkInAt - breakStart) / (1000 * 60)))

        await supabaseAdmin
          .from('attendance_log')
          .update({
            break_end_at: breakEndIso,
            break_duration_minutes: breakDurationMin,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        return {
          success: true,
          action: 'break_end',
          status: 'break_ended',
          breakDurationMinutes: breakDurationMin,
          message: `Break Ended (${breakDurationMin} min)`,
          staff: { id: staff.id, name: staff.name, employee_id: staff.employee_id, designation: staff.designation },
          date: dateStr,
          time: checkInAt.toISOString()
        }
      }

      // ── STATE B: On Duty, No Break Started Yet ──
      // If enableBreak is true, START BREAK!
      if (enableBreak && !existing.break_start_at) {
        const breakStartIso = checkInAt.toISOString()
        await supabaseAdmin
          .from('attendance_log')
          .update({ break_start_at: breakStartIso, updated_at: new Date().toISOString() })
          .eq('id', existing.id)

        return {
          success: true,
          action: 'break_start',
          status: 'on_break',
          message: 'Break Started ☕',
          staff: { id: staff.id, name: staff.name, employee_id: staff.employee_id, designation: staff.designation },
          date: dateStr,
          time: checkInAt.toISOString()
        }
      }

      // ── STATE C: Break Completed OR Break Mode Disabled ──
      // Final Tap: CHECK OUT!
      const checkoutRes = await logCheckOut({ identifier, timestamp, source })
      return {
        alreadyCheckedOut: true,
        ...checkoutRes
      }
    }

    // Tap 1: Create check-in
    let logData = {
      staff_id: staff.id,
      employee_id: staff.employee_id,
      date: dateStr,
      check_in_at: checkInAt.toISOString(),
      status,
      source,
      minutes_late: minutesLate,
      shift_start: shiftStartStr,
      auto_flagged: false,
      admin_override: adminOverride,
      notes: notes || null,
      updated_at: new Date().toISOString()
    }

    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from('attendance_log')
        .update(logData)
        .eq('id', existing.id)
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('attendance_log')
        .insert(logData)
      if (insertError) throw insertError
    }

    if (status === 'late' && !adminOverride) {
      const timeStr = checkInAt.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka'
      })
      sendLateAlert(staff, minutesLate, timeStr, dateStr).catch(() => {})
    }

    if (staff.phone) {
      const timeStr = checkInAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
      sendWhatsAppNotification({
        phone: staff.phone,
        text: `Crown Coffee: Hello ${staff.name}, you checked in at ${timeStr}. Have a great shift!`
      }).catch(() => {})
    }

    return {
      success: true,
      action: 'check_in',
      status,
      minutesLate,
      staff: {
        id: staff.id,
        name: staff.name,
        employee_id: staff.employee_id,
        designation: staff.designation
      },
      date: dateStr,
      checkInAt: checkInAt.toISOString(),
      isUpdate: !!existing
    }
  } catch (err) {
    console.error('[attendance-service] logAttendance error:', err)
    return { success: false, error: err.message || 'Failed to log attendance' }
  }
}

// ── logCheckOut ───────────────────────────────────────────────────────────────

export async function logCheckOut({ identifier, timestamp, source = 'manual' }) {
  try {
    const staff = await resolveStaff(identifier)
    if (!staff) return { success: false, error: 'Employee not found' }

    const checkOutAt = timestamp ? new Date(timestamp) : new Date()
    const calendarDateStr = checkOutAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
    const yesterdayDate = new Date(checkOutAt.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayDateStr = yesterdayDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })

    const { hour: localHour } = getDhakaHourAndMinute(checkOutAt)

    let dateStr = calendarDateStr
    let logEntry = null

    // ── 5:00 AM Business Day Reset Rule ──
    if (localHour < 5) {
      const { data: yesterdayLog } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('date', yesterdayDateStr)
        .maybeSingle()

      if (yesterdayLog && yesterdayLog.check_in_at && !yesterdayLog.check_out_at) {
        logEntry = yesterdayLog
        dateStr = yesterdayDateStr
      }
    }

    if (!logEntry) {
      const { data: todayLog } = await supabaseAdmin
        .from('attendance_log')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('date', dateStr)
        .maybeSingle()
      logEntry = todayLog
    }

    if (!logEntry || !logEntry.check_in_at) {
      return { success: false, error: 'No check-in found for today or yesterday. Cannot check out.' }
    }

    const checkIn = new Date(logEntry.check_in_at)
    let elapsedMinutes = Math.max(0, Math.floor((checkOutAt - checkIn) / (1000 * 60)))

    // ── Auto-close any open break at checkout time ──
    // If staff checked out while still "on break" (forgot to tap after break),
    // auto-end the break at checkout time and record the duration.
    let breakMinutes = logEntry.break_duration_minutes || 0
    if (logEntry.break_start_at && !logEntry.break_end_at) {
      const openBreakStart = new Date(logEntry.break_start_at)
      const autoBreakDuration = Math.max(0, Math.floor((checkOutAt - openBreakStart) / (1000 * 60)))
      breakMinutes = autoBreakDuration
      // Persist the auto-closed break_end_at and duration
      await supabaseAdmin
        .from('attendance_log')
        .update({
          break_end_at: checkOutAt.toISOString(),
          break_duration_minutes: autoBreakDuration,
          notes: `${logEntry.notes || ''} ⚠️ Break auto-closed at checkout`.trim()
        })
        .eq('id', logEntry.id)
    }

    // Safety Guard: Cap max single-shift duty to 16.0 hours (960 mins) to handle forgotten/previous-day check-ins
    if (elapsedMinutes > 960) {
      elapsedMinutes = 960
    }

    const netMinutesWorked = Math.max(0, elapsedMinutes - breakMinutes)
    const hoursWorked = Math.round((netMinutesWorked / 60) * 100) / 100

    // Standard daily duty = 10 hours, 1-hour safety buffer (overtime starts > 11.0 hours)
    const shiftHours = 10.0
    const otThresholdHours = 11.0
    const overtimeHours = hoursWorked > otThresholdHours ? Math.round((hoursWorked - otThresholdHours) * 100) / 100 : 0
    const overtimeMinutes = Math.round(overtimeHours * 60)

    const isEarlyDeparture = hoursWorked < (shiftHours - 0.25)

    const { error } = await supabaseAdmin
      .from('attendance_log')
      .update({
        check_out_at: checkOutAt.toISOString(),
        hours_worked: hoursWorked,
        overtime_minutes: overtimeMinutes,
        notes: isEarlyDeparture ? `early_departure (${hoursWorked}h)` : logEntry.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', logEntry.id)

    if (error) throw error

    if (isEarlyDeparture) {
      const timeStr = checkOutAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
      sendEarlyDepartureAlert(staff, hoursWorked, timeStr).catch(() => {})
    }

    if (staff.phone) {
      const timeStr = checkOutAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
      sendWhatsAppNotification({
        phone: staff.phone,
        text: `Crown Coffee: Hello ${staff.name}, you checked out at ${timeStr}. Total duty: ${hoursWorked} hrs.`
      }).catch(() => {})
    }

    // Sync with overtime_logs table if overtime accrued
    if (overtimeMinutes > 0) {
      const baseSalary = Number(staff.base_salary) || 0
      const hourlyRate = Number(staff.hourly_rate) || Math.round((baseSalary / 30 / 10) * 100) / 100
      const overtimePay = Math.round(overtimeHours * hourlyRate * 100) / 100

      // ── Use BST (Asia/Dhaka) for time strings stored in overtime_logs ──
      const checkInTimeStr = checkIn.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour12: false })
      const checkOutTimeStr = checkOutAt.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour12: false })

      const { data: existingOt } = await supabaseAdmin
        .from('overtime_logs')
        .select('id')
        .eq('staff_id', staff.id)
        .eq('date', dateStr)
        .maybeSingle()

      if (existingOt) {
        await supabaseAdmin
          .from('overtime_logs')
          .update({
            check_in: checkInTimeStr,
            check_out: checkOutTimeStr,
            actual_hours: hoursWorked,
            overtime_hours: overtimeHours,
            hourly_rate: hourlyRate,
            overtime_pay: overtimePay,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingOt.id)
      } else {
        await supabaseAdmin
          .from('overtime_logs')
          .insert([{
            staff_id: staff.id,
            date: dateStr,
            check_in: checkInTimeStr,
            check_out: checkOutTimeStr,
            actual_hours: hoursWorked,
            overtime_hours: overtimeHours,
            hourly_rate: hourlyRate,
            overtime_pay: overtimePay,
            shift_hours: shiftHours
          }])
      }
    }

    return {
      success: true,
      staff: { id: staff.id, name: staff.name, employee_id: staff.employee_id },
      hoursWorked,
      overtimeMinutes,
      overtimeHours,
      checkOutAt: checkOutAt.toISOString()
    }
  } catch (err) {
    console.error('[attendance-service] logCheckOut error:', err)
    return { success: false, error: err.message || 'Failed to log checkout' }
  }
}

// ── autoFlagAbsent ────────────────────────────────────────────────────────────


/**
 * Run by cron after the grace period has passed.
 * Marks all scheduled-but-not-checked-in staff as absent and sends email.
 * Phase 2A: Each staff member's grace cutoff is checked individually —
 * a staff member on an 11:00 AM shift will NOT be flagged at 10:00 AM.
 *
 * @param {string} [dateStr] - YYYY-MM-DD (defaults to today)
 */
export async function autoFlagAbsent(dateStr) {
  // ── Use Bangladesh Standard Time (Asia/Dhaka, UTC+6) for "today" ──
  const targetDate = dateStr || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })

  // ── Get current BST time in minutes since midnight for per-staff cutoff check ──
  const nowBSTStr = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour12: false, hour: '2-digit', minute: '2-digit' })
  const [nowH, nowM] = nowBSTStr.split(':').map(Number)
  const nowMinutesBST = nowH * 60 + nowM

  try {
    // Get all active staff
    const { data: allStaff } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, shift_start, grace_minutes')
      .eq('is_active', true)

    if (!allStaff?.length) return { flagged: 0 }

    // Get existing attendance log for the date
    const { data: existingLogs } = await supabaseAdmin
      .from('attendance_log')
      .select('staff_id, status')
      .eq('date', targetDate)

    const loggedStaffIds = new Set((existingLogs || []).map(l => l.staff_id))

    const absentStaff = []
    const inserts = []
    const skippedTooEarly = []

    for (const s of allStaff) {
      // Skip if already has any attendance record today
      if (loggedStaffIds.has(s.id)) continue

      const roster = await getRosterForDate(s.id, targetDate)

      // ── Phase 2A: Per-staff shift-aware cutoff ──────────────────────────────
      // Only flag if current BST time is PAST this staff member's grace cutoff.
      // E.g. 11:00 AM shift staff won't be flagged at 10:00 AM cron run.
      const effectiveShiftStart = roster?.shift_start || s.shift_start || '08:00'
      const graceMinutes = s.grace_minutes || 15
      const shiftStartMin = timeToMinutes(effectiveShiftStart)
      const graceCutoffMin = shiftStartMin + graceMinutes

      // If it's before their grace cutoff, skip — they're not late yet
      if (nowMinutesBST < graceCutoffMin) {
        skippedTooEarly.push(s.name)
        continue
      }
      // ────────────────────────────────────────────────────────────────────────

      let status = 'absent'
      if (roster) {
        if (roster.is_leave) {
          status = 'on_leave'
        } else if (roster.is_off) {
          status = 'off'
        }
      }

      inserts.push({
        staff_id: s.id,
        employee_id: s.employee_id,
        date: targetDate,
        status,
        source: 'auto',
        auto_flagged: true,
        shift_start: effectiveShiftStart,
        updated_at: new Date().toISOString()
      })

      if (status === 'absent') {
        absentStaff.push(s)
      }
    }

    if (inserts.length > 0) {
      await supabaseAdmin
        .from('attendance_log')
        .upsert(inserts, { onConflict: 'staff_id,date' })
    }

    // Send email alert
    if (absentStaff.length > 0) {
      await sendAbsentAlert(absentStaff, targetDate)
    }

    // Auto-close open check-outs from previous days
    const autoCloseResult = await autoCloseForgottenCheckout()

    return {
      flagged: absentStaff.length,
      staff: absentStaff.map(s => s.name),
      skippedTooEarly: skippedTooEarly.length,
      autoClosed: autoCloseResult.closed || 0
    }
  } catch (err) {
    console.error('[attendance-service] autoFlagAbsent error:', err)
    return { error: err.message }
  }
}

/**
 * Auto-close unclosed check-ins from previous days missing check-out.
 */
export async function autoCloseForgottenCheckout() {
  try {
    // ── Use Bangladesh Standard Time (Asia/Dhaka, UTC+6) for "today" ──
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })

    // Find open logs where check_out_at is NULL and date < today (BST)
    const { data: openLogs, error } = await supabaseAdmin
      .from('attendance_log')
      .select('id, staff_id, check_in_at, date')
      .is('check_out_at', null)
      .lt('date', todayStr)

    if (error || !openLogs?.length) return { closed: 0 }

    let closedCount = 0
    for (const log of openLogs) {
      if (!log.check_in_at) continue

      const checkInTime = new Date(log.check_in_at)

      // Phase 2B: Cap auto-checkout at min(checkIn + 10h, 05:00 AM BST next day)
      // Business day resets at 5:00 AM BST (= 23:00 UTC of the same day)
      // This prevents overnight check-ins (e.g. 11 PM shift) from being closed
      // at 9 AM the next day, inflating hours_worked into the next shift.
      const rawClose = new Date(checkInTime.getTime() + 10 * 60 * 60 * 1000)

      // 5:00 AM BST = UTC+6, so 5AM BST = 23:00 UTC previous day
      const nextDay5amBST = new Date(checkInTime)
      nextDay5amBST.setUTCDate(nextDay5amBST.getUTCDate() + 1)
      nextDay5amBST.setUTCHours(23, 0, 0, 0) // 23:00 UTC = 05:00 BST next day

      const autoCheckOutTime = rawClose < nextDay5amBST ? rawClose : nextDay5amBST

      // Compute actual hours worked from the capped checkout
      const elapsedMs = autoCheckOutTime.getTime() - checkInTime.getTime()
      const hoursWorked = Math.round((elapsedMs / (1000 * 60 * 60)) * 100) / 100

      await supabaseAdmin
        .from('attendance_log')
        .update({
          check_out_at: autoCheckOutTime.toISOString(),
          hours_worked: hoursWorked,
          overtime_minutes: 0,
          notes: '⚠️ Auto-Closed by system (Forgotten Check-Out) — capped at 5AM BST'
        })
        .eq('id', log.id)

      closedCount++
    }

    return { closed: closedCount }
  } catch (err) {
    console.error('[attendance-service] autoCloseForgottenCheckout error:', err)
    return { error: err.message }
  }
}

/**
 * Delete check-in / check-out attendance timings for testing purposes.
 * @param {Object} options
 * @param {string} [options.dateStr] - YYYY-MM-DD (defaults to current date in Bangladesh time)
 * @param {string} [options.staffId] - Staff UUID (optional; if omitted, deletes all staff logs for that date)
 */
export async function deleteDayAttendance({ dateStr, staffId } = {}) {
  try {
    const targetDate = dateStr || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })

    let logQuery = supabaseAdmin.from('attendance_log').delete().eq('date', targetDate)
    if (staffId) {
      logQuery = logQuery.eq('staff_id', staffId)
    }

    const { data: logDeleted, error: logErr } = await logQuery.select('id')
    if (logErr) throw logErr

    // Also clean up overtime_logs for that date if exists
    try {
      let otQuery = supabaseAdmin.from('overtime_logs').delete().eq('date', targetDate)
      if (staffId) {
        otQuery = otQuery.eq('staff_id', staffId)
      }
      await otQuery
    } catch (e) {
      // ignore overtime delete errors
    }

    return {
      success: true,
      date: targetDate,
      deletedCount: logDeleted ? logDeleted.length : 0,
      staffId: staffId || null
    }
  } catch (err) {
    console.error('[attendance-service] deleteDayAttendance error:', err)
    return { success: false, error: err.message || 'Failed to delete attendance logs' }
  }
}

export { sendLateAlert, sendAbsentAlert }

