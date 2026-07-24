import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

/**
 * GET /api/attendance/late-trend
 * Returns per-staff late count, latest 3 late dates, and late % for the current or given month.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const now = new Date()
    const month = parseInt(searchParams.get('month') || now.getMonth() + 1)
    const year = parseInt(searchParams.get('year') || now.getFullYear())

    // Build date range for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toLocaleDateString('en-CA') // last day of month

    // Fetch all late and present records for the month
    const { data: logs, error } = await supabaseAdmin
      .from('attendance_log')
      .select('staff_id, employee_id, date, status, minutes_late, check_in_at')
      .gte('date', startDate)
      .lte('date', endDate)
      .in('status', ['late', 'present', 'absent'])

    if (error) throw error

    // Fetch staff list for names
    const { data: staffList } = await supabaseAdmin
      .from('staff')
      .select('id, name, designation, department')
      .eq('is_active', true)

    const staffMap = new Map((staffList || []).map(s => [s.id, s]))

    // Aggregate per staff
    const agg = {}
    for (const log of (logs || [])) {
      if (!agg[log.staff_id]) {
        const s = staffMap.get(log.staff_id)
        agg[log.staff_id] = {
          staff_id: log.staff_id,
          name: s?.name || 'Unknown',
          designation: s?.designation || '',
          department: s?.department || 'front',
          late_count: 0,
          present_count: 0,
          absent_count: 0,
          total_minutes_late: 0,
          late_dates: []
        }
      }
      const a = agg[log.staff_id]
      if (log.status === 'late') {
        a.late_count++
        a.total_minutes_late += log.minutes_late || 0
        a.late_dates.push(log.date)
      } else if (log.status === 'present') {
        a.present_count++
      } else if (log.status === 'absent') {
        a.absent_count++
      }
    }

    const result = Object.values(agg).map(a => ({
      ...a,
      working_days: a.late_count + a.present_count + a.absent_count,
      late_percent: a.late_count + a.present_count > 0
        ? Math.round((a.late_count / (a.late_count + a.present_count)) * 100)
        : 0,
      avg_minutes_late: a.late_count > 0 ? Math.round(a.total_minutes_late / a.late_count) : 0,
      late_dates: a.late_dates.slice(-3) // last 3 late dates
    }))

    // Sort by late_count descending
    result.sort((a, b) => b.late_count - a.late_count)

    return NextResponse.json({ month, year, trends: result })
  } catch (err) {
    console.error('[GET /api/attendance/late-trend]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
