import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { logAttendance, logCheckOut } from '../../../../lib/attendance-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/attendance/geofence-review?date=YYYY-MM-DD
 * Compares geofence entry/exit events today with the attendance table.
 * Identifies staff whose attendance can be manually reviewed and approved.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]

    const startOfDay = `${dateStr}T00:00:00.000Z`
    const endOfDay = `${dateStr}T23:59:59.999Z`

    // 1. Fetch active staff
    const { data: staffList, error: sErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, department, shift_start, photo_url, emergency_phone')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (sErr) throw sErr

    // 2. Fetch today's official attendance records
    const { data: attendanceRecords } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('date', dateStr)

    const attMap = new Map()
    ;(attendanceRecords || []).forEach((a) => {
      attMap.set(a.staff_id, a)
    })

    // 3. Fetch today's geofence events
    const { data: geofenceEvents } = await supabaseAdmin
      .from('geofence_events')
      .select('id, staff_id, event_type, recorded_at')
      .gte('recorded_at', startOfDay)
      .lte('recorded_at', endOfDay)
      .order('recorded_at', { ascending: true })

    // 4. Fetch latest live location to know if currently inside cafe
    const { data: liveLocs } = await supabaseAdmin
      .from('staff_locations')
      .select('staff_id, is_inside_geofence, last_updated')

    const liveMap = new Map()
    ;(liveLocs || []).forEach((l) => {
      liveMap.set(l.staff_id, l)
    })

    // Group events per staff
    const eventsByStaff = new Map()
    ;(geofenceEvents || []).forEach((ev) => {
      if (!eventsByStaff.has(ev.staff_id)) {
        eventsByStaff.set(ev.staff_id, [])
      }
      eventsByStaff.get(ev.staff_id).push(ev)
    })

    // Combine into reviewable proposals
    const proposals = []

    for (const s of staffList) {
      const events = eventsByStaff.get(s.id) || []
      const existingAtt = attMap.get(s.id)
      const live = liveMap.get(s.id)

      const firstEnter = events.find((e) => e.event_type === 'enter')
      const lastExit = [...events].reverse().find((e) => e.event_type === 'exit')

      // If staff has geofence activity or is currently inside
      if (firstEnter || live?.is_inside_geofence) {
        const arrivalTime = firstEnter
          ? new Date(firstEnter.recorded_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'Asia/Dhaka'
            })
          : null

        const departureTime = lastExit
          ? new Date(lastExit.recorded_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'Asia/Dhaka'
            })
          : null

        const isApproved = !!existingAtt && (existingAtt.status === 'present' || existingAtt.status === 'late')
        const isCurrentlyInside = live?.is_inside_geofence || false

        proposals.push({
          staff_id: s.id,
          name: s.name,
          employee_id: s.employee_id,
          designation: s.designation,
          photo_url: s.photo_url,
          rostered_shift_start: s.shift_start || '10:00:00',
          geofence_arrival: arrivalTime,
          geofence_arrival_raw: firstEnter?.recorded_at || null,
          geofence_departure: departureTime,
          geofence_departure_raw: lastExit?.recorded_at || null,
          is_currently_inside: isCurrentlyInside,
          attendance_status: existingAtt?.status || 'none',
          is_attendance_recorded: isApproved,
          existing_check_in: existingAtt?.check_in_time || null,
          existing_check_out: existingAtt?.check_out_time || null,
          needs_review: !isApproved || (isApproved && !existingAtt?.check_out_time && !isCurrentlyInside)
        })
      }
    }

    return NextResponse.json({
      success: true,
      date: dateStr,
      proposals
    })
  } catch (err) {
    console.error('[GET /api/attendance/geofence-review]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/attendance/geofence-review
 * Admin manually approves a geofence arrival or departure.
 * Body: { staffId, action: 'checkin' | 'checkout', timestamp?, forceStatus? }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { staffId, action = 'checkin', timestamp, forceStatus = null } = body

    if (!staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 })
    }

    if (action === 'checkin') {
      const res = await logAttendance({
        identifier: staffId,
        timestamp: timestamp || new Date().toISOString(),
        source: 'geofence_verified',
        adminOverride: true,
        forceStatus: forceStatus || undefined,
        notes: 'Manually verified from GPS geofence arrival'
      })

      if (!res.success) {
        return NextResponse.json({ error: res.error || 'Failed to record checkin' }, { status: 400 })
      }
      return NextResponse.json({ success: true, result: res })
    } else if (action === 'checkout') {
      const res = await logCheckOut({
        identifier: staffId,
        timestamp: timestamp || new Date().toISOString(),
        source: 'geofence_verified'
      })

      if (!res.success) {
        return NextResponse.json({ error: res.error || 'Failed to record checkout' }, { status: 400 })
      }
      return NextResponse.json({ success: true, result: res })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('[POST /api/attendance/geofence-review]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
