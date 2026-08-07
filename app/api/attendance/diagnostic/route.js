export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

/**
 * GET /api/attendance/diagnostic?month=7&year=2026
 * Returns all attendance_log records for a given month, joined with staff details.
 * Fixed: previously queried the wrong table (attendance with month/year columns that don't exist).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month'))
    const year = parseInt(searchParams.get('year'))

    if (!month || !year) {
      return NextResponse.json({ error: 'month and year query params are required' }, { status: 400 })
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toLocaleDateString('en-CA') // last day of month

    // Fetch logs from attendance_log (source of truth), not the derived attendance table
    const { data: logs, error } = await supabaseAdmin
      .from('attendance_log')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('check_in_at', { ascending: true })

    if (error) throw error

    // Fetch staff details for name lookup
    const { data: staffList } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, department, base_salary')

    const staffMap = new Map((staffList || []).map(s => [s.id, s]))

    const formatted = (logs || []).map(log => {
      const staff = staffMap.get(log.staff_id) || {}
      return {
        ...log,
        staff_name: staff.name || log.employee_id || 'Unknown',
        designation: staff.designation || '',
        department: staff.department || '',
      }
    })

    // Summary counts for quick health check
    const summary = {
      total: formatted.length,
      present: formatted.filter(r => r.status === 'present').length,
      late: formatted.filter(r => r.status === 'late').length,
      absent: formatted.filter(r => r.status === 'absent').length,
      on_leave: formatted.filter(r => r.status === 'on_leave').length,
      off: formatted.filter(r => r.status === 'off').length,
      missing_checkout: formatted.filter(r => r.check_in_at && !r.check_out_at).length,
    }

    return NextResponse.json({ month, year, startDate, endDate, summary, attendance: formatted })
  } catch (err) {
    console.error('[GET /api/attendance/diagnostic]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
