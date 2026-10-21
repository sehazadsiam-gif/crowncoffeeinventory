import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/tracking/reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Generates Weekly / Monthly Location Analytics & Night Activity Report.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const now = new Date()
    const defaultEnd = now.toISOString().split('T')[0]
    const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const defaultStart = pastWeek.toISOString().split('T')[0]

    const startDate = searchParams.get('startDate') || defaultStart
    const endDate = searchParams.get('endDate') || defaultEnd

    // 1. Fetch staff
    const { data: staffList, error: sErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, department, shift_start')
      .eq('is_active', true)

    if (sErr) throw sErr

    // 2. Fetch geofence events in period
    const { data: events, error: eErr } = await supabaseAdmin
      .from('geofence_events')
      .select('*')
      .gte('recorded_at', `${startDate}T00:00:00.000Z`)
      .lte('recorded_at', `${endDate}T23:59:59.999Z`)
      .order('recorded_at', { ascending: true })

    if (eErr) throw eErr

    // 3. Fetch errands in period
    const { data: errands } = await supabaseAdmin
      .from('errand_trips')
      .select('*')
      .gte('departure_time', `${startDate}T00:00:00.000Z`)
      .lte('departure_time', `${endDate}T23:59:59.999Z`)

    // 4. Fetch SOS alerts in period
    const { data: sosAlerts } = await supabaseAdmin
      .from('sos_alerts')
      .select('*')
      .gte('created_at', `${startDate}T00:00:00.000Z`)
      .lte('created_at', `${endDate}T23:59:59.999Z`)

    // Aggregate statistics per staff
    const staffReport = staffList.map((staff) => {
      const sEvents = (events || []).filter((e) => e.staff_id === staff.id)
      const sErrands = (errands || []).filter((e) => e.staff_id === staff.id)
      const sSos = (sosAlerts || []).filter((s) => s.staff_id === staff.id)

      const enterEvents = sEvents.filter((e) => e.event_type === 'enter')
      const exitEvents = sEvents.filter((e) => e.event_type === 'exit')

      return {
        staff_id: staff.id,
        name: staff.name,
        employee_id: staff.employee_id,
        designation: staff.designation,
        cafe_entries_count: enterEvents.length,
        cafe_exits_count: exitEvents.length,
        errands_count: sErrands.length,
        sos_alerts_count: sSos.length
      }
    })

    return NextResponse.json({
      success: true,
      period: { startDate, endDate },
      totalStaff: staffList.length,
      totalEvents: (events || []).length,
      totalErrands: (errands || []).length,
      totalSosAlerts: (sosAlerts || []).length,
      staffReport
    })
  } catch (err) {
    console.error('[GET /api/admin/tracking/reports]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
