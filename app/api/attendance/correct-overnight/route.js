import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

/**
 * POST /api/attendance/correct-overnight
 * One-click fix for staff who tapped after 12:00 AM midnight.
 * Moves the midnight tap to their previous day's record as a check-out,
 * computes total hours worked & overtime, and deletes the accidental next-day check-in.
 */
export async function POST(request) {
  try {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
    const yesterdayObj = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const yesterdayStr = yesterdayObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })

    // Find all records from today where check_in_at is early morning (between 00:00 AM and 05:00 AM)
    const { data: todayEarlyLogs, error: fetchErr } = await supabaseAdmin
      .from('attendance_log')
      .select('*')
      .eq('date', todayStr)
      .is('check_out_at', null)

    if (fetchErr) throw fetchErr

    const fixes = []

    for (const todayLog of todayEarlyLogs || []) {
      if (!todayLog.check_in_at) continue

      const checkInTime = new Date(todayLog.check_in_at)
      const localHour = parseInt(checkInTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour12: false }).split(':')[0], 10) % 24

      // Only target taps between 00:00 and 04:59 AM
      if (localHour < 5) {
        // Find unclosed log from yesterday for this staff member
        const { data: yesterdayLog } = await supabaseAdmin
          .from('attendance_log')
          .select('*')
          .eq('staff_id', todayLog.staff_id)
          .eq('date', yesterdayStr)
          .maybeSingle()

        if (yesterdayLog && yesterdayLog.check_in_at) {
          const checkInDate = new Date(yesterdayLog.check_in_at)
          const checkOutDate = new Date(todayLog.check_in_at)

          const elapsedMins = Math.max(0, Math.floor((checkOutDate - checkInDate) / 60000))
          const breakMins = yesterdayLog.break_duration_minutes || 0
          const netMins = Math.max(0, elapsedMins - breakMins)
          const hoursWorked = Math.round((netMins / 60) * 100) / 100

          const otThresholdHours = 11.0
          const overtimeHours = hoursWorked > otThresholdHours ? Math.round((hoursWorked - otThresholdHours) * 100) / 100 : 0
          const overtimeMins = Math.round(overtimeHours * 60)

          // 1. Update yesterday's log with check_out_at, hours_worked, and overtime
          const { error: updateErr } = await supabaseAdmin
            .from('attendance_log')
            .update({
              check_out_at: todayLog.check_in_at,
              hours_worked: hoursWorked,
              overtime_minutes: overtimeMins,
              updated_at: new Date().toISOString()
            })
            .eq('id', yesterdayLog.id)

          if (updateErr) throw updateErr

          // 2. Delete the accidental next-day check-in log
          const { error: deleteErr } = await supabaseAdmin
            .from('attendance_log')
            .delete()
            .eq('id', todayLog.id)

          if (deleteErr) throw deleteErr

          fixes.push({
            staff_id: todayLog.staff_id,
            employee_id: todayLog.employee_id,
            yesterday_date: yesterdayStr,
            check_out_at: todayLog.check_in_at,
            hours_worked: hoursWorked,
            overtime_hours: overtimeHours
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully corrected ${fixes.length} overnight attendance record(s).`,
      fixedRecords: fixes
    })
  } catch (err) {
    console.error('[POST /api/attendance/correct-overnight]', err)
    return NextResponse.json({ error: err.message || 'Overnight correction failed' }, { status: 500 })
  }
}
