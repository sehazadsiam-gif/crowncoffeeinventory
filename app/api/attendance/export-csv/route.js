import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

/**
 * GET /api/attendance/export-csv
 * Generates and downloads a CSV report for the specified month & year.
 * Query params: ?month=7&year=2026
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const now = new Date()
    const month = parseInt(searchParams.get('month') || now.getMonth() + 1)
    const year = parseInt(searchParams.get('year') || now.getFullYear())

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toLocaleDateString('en-CA') // last day of month

    // Fetch all logs for the month
    const { data: logs, error: logErr } = await supabaseAdmin
      .from('attendance_log')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (logErr) throw logErr

    // Fetch staff details
    const { data: staffList } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, department, base_salary, hourly_rate')
      .eq('is_active', true)

    const staffMap = new Map((staffList || []).map(s => [s.id, s]))

    // CSV Headers
    const headers = [
      'Date',
      'Employee ID',
      'Staff Name',
      'Department',
      'Designation',
      'Status',
      'Check-In Time (BST)',
      'Check-Out Time (BST)',
      'Minutes Late',
      'Hours Worked',
      'Overtime Mins',
      'Notes'
    ]

    const formatTime = (isoStr) => {
      if (!isoStr) return ''
      return new Date(isoStr).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Dhaka'
      })
    }

    const rows = (logs || []).map(l => {
      const s = staffMap.get(l.staff_id) || {}
      return [
        l.date,
        s.employee_id || l.employee_id || '',
        `"${s.name || 'Unknown'}"`,
        s.department || 'front',
        `"${s.designation || ''}"`,
        (l.status || '').toUpperCase(),
        formatTime(l.check_in_at),
        formatTime(l.check_out_at),
        l.minutes_late || 0,
        l.hours_worked || 0,
        l.overtime_minutes || 0,
        `"${(l.notes || '').replace(/"/g, '""')}"`
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' })
    const filename = `CrownCoffee_Attendance_${monthName}_${year}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (err) {
    console.error('[GET /api/attendance/export-csv]', err)
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 })
  }
}
