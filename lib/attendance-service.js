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
 * Parse a TIME string (HH:MM or HH:MM:SS) into minutes since midnight.
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + (m || 0)
}

/**
 * Get the Saturday of the week (Saturday -> Friday cycle) containing the given date.
 */
function getSaturdayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 6 ? 0 : -(day + 1))
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
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
  forceStatus = null
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

    // Bulletproof YYYY-MM-DD in Asia/Dhaka
    const dateStr = checkInAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })

    const timeStrParts = checkInAt.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour12: false }).split(':')
    const localHour = parseInt(timeStrParts[0], 10) % 24
    const localMin = parseInt(timeStrParts[1], 10) || 0
    const checkInMinutes = localHour * 60 + localMin

    // ── 60-Second Debounce Guard for Bouncy Readers ──
    const lastTapMs = lastTapMap.get(staff.id) || 0
    if (nowMs - lastTapMs < 60000 && !adminOverride) {
      return {
        success: true,
        debounced: true,
        message: 'Duplicate tap ignored (within 60s)',
        staff: { id: staff.id, name: staff.name, employee_id: staff.employee_id }
      }
    }
    lastTapMap.set(staff.id, nowMs)

    // 3. Classify shift and lateness based on 2 fixed entry points (Asia/Dhaka local time):
    // Morning Shift: 8:00 AM (grace until 8:15 AM = 495 mins)
    // Afternoon Shift: 1:00 PM / 13:00 (grace until 1:15 PM = 795 mins)
    let shiftStartStr = '08:00'
    let deadlineMinutes = 8 * 60 + 15 // 8:15 AM (495 minutes)

    if (checkInMinutes >= 11 * 60) {
      shiftStartStr = '13:00'
      deadlineMinutes = 13 * 60 + 15 // 1:15 PM (795 minutes)
    }

    let status = 'present'
    let minutesLate = 0

    if (adminOverride && forceStatus) {
      status = forceStatus
    } else {
      if (checkInMinutes > deadlineMinutes) {
        status = 'late'
        minutesLate = checkInMinutes - deadlineMinutes
      } else {
        status = 'present'
        minutesLate = 0
      }
    }

    // 5. Calculate hours worked if check-in and check-out are both known
    // (check-out is handled separately via the checkout endpoint)

    // 6. Look up today's existing log
    const { data: existing } = await supabaseAdmin
      .from('attendance_log')
      .select('id, status, check_in_at, check_out_at')
      .eq('staff_id', staff.id)
      .eq('date', dateStr)
      .maybeSingle()

    // ── TAP RULES ──────────────────────────────────────────────────────────────
    // Tap 1 (no record yet)          → Check In
    // Tap 2 (checked in, no out yet) → Check Out
    // Tap 3+ (already fully complete) → BLOCKED. Nothing happens.
    if (existing && existing.check_in_at && existing.check_out_at && !adminOverride) {
      return {
        success: false,
        blocked: true,
        error: 'Attendance already complete for today. Check-in and check-out both recorded.',
        staff: { id: staff.id, name: staff.name, employee_id: staff.employee_id }
      }
    }

    // Tap 2: checked in but not yet out → do check-out now
    if (existing && existing.check_in_at && !existing.check_out_at && !adminOverride) {
      const checkoutRes = await logCheckOut({ identifier, timestamp, source })
      return {
        alreadyCheckedOut: true,
        ...checkoutRes
      }
    }

    // Tap 1: no record yet → create check-in
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

    if (existing && adminOverride) {
      // Admin override: update existing record
      const { error: updateError } = await supabaseAdmin
        .from('attendance_log')
        .update(logData)
        .eq('id', existing.id)
      if (updateError) throw updateError
    } else {
      // Normal tap 1: insert new record
      const { error: insertError } = await supabaseAdmin
        .from('attendance_log')
        .insert(logData)
      if (insertError) throw insertError
    }

    // 7. Send late alert email & WhatsApp (async)
    if (status === 'late' && !adminOverride) {
      const timeStr = checkInAt.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true
      })
      sendLateAlert(staff, minutesLate, timeStr, dateStr).catch(() => {})
    }

    // Send WhatsApp check-in notification if phone is set
    if (staff.phone) {
      const timeStr = checkInAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      sendWhatsAppNotification({
        phone: staff.phone,
        text: `Crown Coffee: Hello ${staff.name}, you checked in at ${timeStr}. Have a great shift!`
      }).catch(() => {})
    }

    return {
      success: true,
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

/**
 * Record a check-out and compute hours worked.
 */
export async function logCheckOut({ identifier, timestamp, source = 'manual' }) {
  try {
    const staff = await resolveStaff(identifier)
    if (!staff) return { success: false, error: 'Employee not found' }

    const checkOutAt = timestamp ? new Date(timestamp) : new Date()
    const dateStr = checkOutAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })

    const { data: logEntry } = await supabaseAdmin
      .from('attendance_log')
      .select('*')
      .eq('staff_id', staff.id)
      .eq('date', dateStr)
      .maybeSingle()

    if (!logEntry || !logEntry.check_in_at) {
      return { success: false, error: 'No check-in found for today. Cannot check out.' }
    }

    const checkIn = new Date(logEntry.check_in_at)
    const totalMinutesWorked = Math.max(0, Math.floor((checkOutAt - checkIn) / (1000 * 60)))
    const hoursWorked = Math.round((totalMinutesWorked / 60) * 100) / 100

    // Standard shift duty = 10 hours
    const shiftHours = staff.shift_hours || 10
    const overtimeHours = hoursWorked > shiftHours ? Math.round((hoursWorked - shiftHours) * 100) / 100 : 0
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
      const timeStr = checkOutAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      sendEarlyDepartureAlert(staff, hoursWorked, timeStr).catch(() => {})
    }

    if (staff.phone) {
      const timeStr = checkOutAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
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

      const checkInTimeStr = checkIn.toTimeString().split(' ')[0]
      const checkOutTimeStr = checkOutAt.toTimeString().split(' ')[0]

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
 *
 * @param {string} [dateStr] - YYYY-MM-DD (defaults to today)
 */
export async function autoFlagAbsent(dateStr) {
  const targetDate = dateStr || new Date().toISOString().split('T')[0]

  try {
    // Get all active staff
    const { data: allStaff } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, shift_start, weekly_off, grace_minutes')
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

    const targetDay = new Date(targetDate).toLocaleDateString('en-US', { weekday: 'long' })

    for (const s of allStaff) {
      // Skip if already logged
      if (loggedStaffIds.has(s.id)) continue

      // Check if this is their day off
      const isOff = s.weekly_off && targetDay.toLowerCase() === s.weekly_off.toLowerCase()

      // Check duty_roster for override
      const { data: rosterEntry } = await supabaseAdmin
        .from('duty_roster')
        .select('is_off, is_leave')
        .eq('staff_id', s.id)
        .eq('day_date', targetDate)
        .single()

      const isOffByRoster = rosterEntry?.is_off || rosterEntry?.is_leave || false

      if (isOff || isOffByRoster) continue

      // Mark as absent
      inserts.push({
        staff_id: s.id,
        employee_id: s.employee_id,
        date: targetDate,
        status: 'absent',
        source: 'auto',
        auto_flagged: true,
        shift_start: s.shift_start,
        updated_at: new Date().toISOString()
      })
      absentStaff.push(s)
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

    return { flagged: absentStaff.length, staff: absentStaff.map(s => s.name), autoClosed: autoCloseResult.closed || 0 }
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
    const todayStr = new Date().toISOString().split('T')[0]
    
    // Find open logs where check_out_at is NULL and date < today
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
      const autoCheckOutTime = new Date(checkInTime.getTime() + 10 * 60 * 60 * 1000)

      await supabaseAdmin
        .from('attendance_log')
        .update({
          check_out_at: autoCheckOutTime.toISOString(),
          hours_worked: 10.0,
          overtime_minutes: 0,
          notes: '⚠️ Auto-Closed by system (Forgotten Check-Out)'
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

