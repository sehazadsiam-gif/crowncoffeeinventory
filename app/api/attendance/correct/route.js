import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { logAttendance } from '../../../../lib/attendance-service'

/**
 * PATCH /api/attendance/correct
 * Allows admin to directly edit the check-in or check-out time of an existing record.
 * Body: { logId, checkInAt?, checkOutAt?, date }
 */
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { logId, checkInAt, checkOutAt, staffId, date } = body

    if (!logId) {
      return NextResponse.json({ error: 'logId is required' }, { status: 400 })
    }

    // Build update object with only fields provided
    const updates = { updated_at: new Date().toISOString(), admin_override: true }

    if (checkInAt) {
      // Parse the local BST time string (e.g. "08:30") + date → ISO
      const isoCheckIn = new Date(`${date}T${checkInAt}:00+06:00`).toISOString()
      updates.check_in_at = isoCheckIn

      // Recalculate lateness (11:00 AM or 1:00 PM shift)
      const [h, m] = checkInAt.split(':').map(Number)
      const totalMins = h * 60 + m
      let shiftStartStr = '11:00'
      let shiftMins = 11 * 60

      if (totalMins >= 12 * 60 + 30) {
        shiftStartStr = '13:00'
        shiftMins = 13 * 60
      }

      const graceDeadline = shiftMins + 15
      const late = totalMins > graceDeadline
      updates.status = late ? 'late' : 'present'
      updates.minutes_late = late ? totalMins - shiftMins : 0
      updates.shift_start = shiftStartStr
    }

    if (checkOutAt) {
      const isoCheckOut = new Date(`${date}T${checkOutAt}:00+06:00`).toISOString()
      updates.check_out_at = isoCheckOut

      // Recalculate hours worked if check-in is also known
      const { data: existing } = await supabaseAdmin
        .from('attendance_log')
        .select('check_in_at')
        .eq('id', logId)
        .single()

      if (existing?.check_in_at) {
        const checkInDate = new Date(existing.check_in_at)
        const checkOutDate = new Date(`${date}T${checkOutAt}:00+06:00`)
        const diffMins = (checkOutDate - checkInDate) / 60000
        if (diffMins > 0) {
          const hw = Math.round((diffMins / 60) * 100) / 100
          updates.hours_worked = hw
          const otMins = hw > 11.0 ? Math.round((hw - 11.0) * 60) : 0
          updates.overtime_minutes = otMins
        }
      }
    }

    const { error } = await supabaseAdmin
      .from('attendance_log')
      .update(updates)
      .eq('id', logId)

    if (error) throw error

    return NextResponse.json({ success: true, updates })
  } catch (err) {
    console.error('[PATCH /api/attendance/correct]', err)
    return NextResponse.json({ error: err.message || 'Correction failed' }, { status: 500 })
  }
}
