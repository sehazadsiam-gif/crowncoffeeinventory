import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/overtime/gps-audit?date=YYYY-MM-DD (or month=M&year=Y)
 * Checks overtime records against GPS departure logs.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let query = supabaseAdmin
      .from('attendance')
      .select(`
        id,
        staff_id,
        date,
        check_in_time,
        check_out_time,
        hours_worked,
        overtime_hours,
        status,
        notes,
        staff:staff_id (
          id,
          name,
          employee_id,
          designation,
          shift_start,
          photo_url
        )
      `)
      .gt('overtime_hours', 0)

    if (dateStr) {
      query = query.eq('date', dateStr)
    } else if (month && year) {
      const mPad = String(month).padStart(2, '0')
      const startDate = `${year}-${mPad}-01`
      const endDate = `${year}-${mPad}-31`
      query = query.gte('date', startDate).lte('date', endDate)
    } else {
      // Default to today
      const today = new Date().toISOString().split('T')[0]
      query = query.eq('date', today)
    }

    const { data: records, error } = await query.order('date', { ascending: false })
    if (error) throw error

    const audits = []

    for (const rec of records || []) {
      const staffId = rec.staff_id
      const recordDate = rec.date
      const startOfDay = `${recordDate}T00:00:00.000Z`
      const endOfDay = `${recordDate}T23:59:59.999Z`

      // Fetch last geofence exit or last location ping on this date
      const { data: lastExitEvent } = await supabaseAdmin
        .from('geofence_events')
        .select('recorded_at')
        .eq('staff_id', staffId)
        .eq('event_type', 'exit')
        .gte('recorded_at', startOfDay)
        .lte('recorded_at', endOfDay)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Also check last known location log
      const { data: lastLocLog } = await supabaseAdmin
        .from('staff_location_logs')
        .select('recorded_at')
        .eq('staff_id', staffId)
        .gte('recorded_at', startOfDay)
        .lte('recorded_at', endOfDay)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const gpsDepartureRaw = lastExitEvent?.recorded_at || lastLocLog?.recorded_at || null
      let gpsDepartureTime = null
      let gpsVerifiedOTHours = null
      let discrepancyStatus = 'no_gps' // 'verified' | 'discrepancy' | 'no_gps'
      let discrepancyHours = 0

      if (gpsDepartureRaw) {
        const depDate = new Date(gpsDepartureRaw)
        gpsDepartureTime = depDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Dhaka'
        })

        // Standard shift is 10 hours from shift_start
        const shiftStartStr = rec.staff?.shift_start || '10:00:00'
        const [shHours, shMins] = shiftStartStr.split(':').map(Number)
        const shiftEndHour = shHours + 10

        const depHourVal = depDate.getHours() + depDate.getMinutes() / 60
        const diffFromShiftEnd = Math.max(0, depHourVal - shiftEndHour)
        gpsVerifiedOTHours = Math.round(diffFromShiftEnd * 10) / 10

        const claimedOT = Number(rec.overtime_hours || 0)
        discrepancyHours = Math.round((claimedOT - gpsVerifiedOTHours) * 10) / 10

        if (discrepancyHours > 0.3) {
          discrepancyStatus = 'discrepancy'
        } else {
          discrepancyStatus = 'verified'
        }
      }

      audits.push({
        attendance_id: rec.id,
        staff_id: staffId,
        staff_name: rec.staff?.name,
        employee_id: rec.staff?.employee_id,
        designation: rec.staff?.designation,
        photo_url: rec.staff?.photo_url,
        date: recordDate,
        shift_start: rec.staff?.shift_start || '10:00:00',
        check_in_time: rec.check_in_time,
        check_out_time: rec.check_out_time,
        claimed_overtime_hours: Number(rec.overtime_hours || 0),
        gps_departure_time: gpsDepartureTime,
        gps_departure_raw: gpsDepartureRaw,
        gps_verified_ot_hours: gpsVerifiedOTHours,
        discrepancy_status: discrepancyStatus,
        discrepancy_hours: discrepancyHours
      })
    }

    return NextResponse.json({
      success: true,
      audits
    })
  } catch (err) {
    console.error('[GET /api/admin/overtime/gps-audit]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/admin/overtime/gps-audit
 * Admin manually reviews and sets approved overtime hours.
 * Body: { attendanceId, approvedOvertimeHours, notes? }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { attendanceId, approvedOvertimeHours, notes } = body

    if (!attendanceId || approvedOvertimeHours === undefined) {
      return NextResponse.json({ error: 'attendanceId and approvedOvertimeHours are required' }, { status: 400 })
    }

    const otNum = Math.max(0, parseFloat(approvedOvertimeHours))

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .update({
        overtime_hours: otNum,
        notes: notes ? `${notes} (Manually GPS-audited by admin)` : 'Manually GPS-audited by admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', attendanceId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, updated: data })
  } catch (err) {
    console.error('[POST /api/admin/overtime/gps-audit]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
