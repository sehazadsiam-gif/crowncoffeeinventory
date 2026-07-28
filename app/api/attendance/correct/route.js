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

      // Recalculate lateness
      const [h, m] = checkInAt.split(':').map(Number)
      const totalMins = h * 60 + m
      const isAfternoon = totalMins >= 11 * 60
      const graceDeadline = isAfternoon ? 13 * 60 + 15 : 8 * 60 + 15
      const late = totalMins > graceDeadline
      updates.status = late ? 'late' : 'present'
      updates.minutes_late = late ? totalMins - graceDeadline : 0
      updates.shift_start = isAfternoon ? '13:00' : '08:00'
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
          const otMins = hw > 10.0 ? Math.round((hw - 10.0) * 60) : 0
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
