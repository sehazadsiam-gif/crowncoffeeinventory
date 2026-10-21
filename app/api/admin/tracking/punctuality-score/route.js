import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/tracking/punctuality-score?month=M&year=Y
 * Calculates monthly GPS geofence punctuality score and arrival patterns for all staff.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear())

    const mPad = String(month).padStart(2, '0')
    const startDate = `${year}-${mPad}-01`
    const endDate = `${year}-${mPad}-31`

    // 1. Fetch active staff
    const { data: staffList, error: sErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, department, shift_start, photo_url')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (sErr) throw sErr

    // 2. Fetch monthly attendance
    const { data: attendance, error: aErr } = await supabaseAdmin
      .from('attendance')
      .select('staff_id, date, status, check_in_time, check_out_time, hours_worked')
      .gte('date', startDate)
      .lte('date', endDate)

    if (aErr) throw aErr

    // 3. Fetch geofence entry events for this month
    const { data: geofenceEntries, error: gErr } = await supabaseAdmin
      .from('geofence_events')
      .select('staff_id, event_type, recorded_at')
      .eq('event_type', 'enter')
      .gte('recorded_at', `${startDate}T00:00:00.000Z`)
      .lte('recorded_at', `${endDate}T23:59:59.999Z`)

    if (gErr) throw gErr

    // Aggregate by staff
    const scores = staffList.map((staff) => {
      const staffAtt = (attendance || []).filter((a) => a.staff_id === staff.id)
      const staffEntries = (geofenceEntries || []).filter((g) => g.staff_id === staff.id)

      const shiftStartStr = staff.shift_start || '10:00:00'
      const [shH, shM] = shiftStartStr.split(':').map(Number)
      const shiftStartDecimal = shH + (shM || 0) / 60

      let onTimeDays = 0
      let totalRosteredDays = staffAtt.length
      let totalLateMins = 0
      let presentDays = 0

      staffAtt.forEach((rec) => {
        if (rec.status === 'present' || rec.status === 'late') {
          presentDays++

          // Check if geofence arrival on this date was on time
          const dayEntry = staffEntries.find(
            (e) => e.recorded_at.split('T')[0] === rec.date
          )

          if (dayEntry) {
            const entryDate = new Date(dayEntry.recorded_at)
            const entryDecimal = entryDate.getHours() + entryDate.getMinutes() / 60
            const diffMins = Math.round((entryDecimal - shiftStartDecimal) * 60)

            if (diffMins <= 5) {
              // 5-min grace period
              onTimeDays++
            } else {
              totalLateMins += diffMins
            }
          } else if (rec.status === 'present') {
            onTimeDays++
          }
        }
      })

      const punctualityRate =
        presentDays > 0 ? Math.round((onTimeDays / presentDays) * 100) : 100
      const avgLateMins =
        presentDays - onTimeDays > 0
          ? Math.round(totalLateMins / (presentDays - onTimeDays))
          : 0

      let grade = 'A+'
      if (punctualityRate < 70) grade = 'D'
      else if (punctualityRate < 80) grade = 'C'
      else if (punctualityRate < 90) grade = 'B'
      else if (punctualityRate < 95) grade = 'A'

      return {
        staff_id: staff.id,
        name: staff.name,
        employee_id: staff.employee_id,
        designation: staff.designation,
        photo_url: staff.photo_url,
        scheduled_shift: shiftStartStr.slice(0, 5),
        present_days: presentDays,
        total_days: totalRosteredDays,
        on_time_days: onTimeDays,
        late_days: presentDays - onTimeDays,
        punctuality_percent: punctualityRate,
        avg_late_minutes: avgLateMins,
        grade
      }
    })

    return NextResponse.json({
      success: true,
      month,
      year,
      scores
    })
  } catch (err) {
    console.error('[GET /api/admin/tracking/punctuality-score]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
