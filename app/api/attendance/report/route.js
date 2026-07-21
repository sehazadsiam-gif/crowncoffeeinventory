import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || new Date().getFullYear())

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data: staff, error: staffErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, base_salary')
      .eq('is_active', true)
      .order('serial', { ascending: true })

    if (staffErr) throw staffErr

    const { data: logs, error: logsErr } = await supabaseAdmin
      .from('attendance_log')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)

    if (logsErr) throw logsErr

    const staffReports = (staff || []).map(s => {
      const sLogs = (logs || []).filter(l => l.staff_id === s.id)

      const present = sLogs.filter(l => l.status === 'present').length
      const late = sLogs.filter(l => l.status === 'late').length
      const absent = sLogs.filter(l => l.status === 'absent').length
      const onLeave = sLogs.filter(l => l.status === 'on_leave').length
      const off = sLogs.filter(l => l.status === 'off').length
      const totalHours = Math.round(sLogs.reduce((sum, l) => sum + (l.hours_worked || 0), 0) * 10) / 10
      const totalLateMinutes = sLogs.reduce((sum, l) => sum + (l.minutes_late || 0), 0)

      return {
        staff_id: s.id,
        name: s.name,
        employee_id: s.employee_id || 'N/A',
        designation: s.designation,
        base_salary: s.base_salary,
        present,
        late,
        absent,
        on_leave: onLeave,
        off,
        total_days_worked: present + late,
        total_hours: totalHours,
        total_late_minutes: totalLateMinutes
      }
    })

    const companySummary = {
      month,
      year,
      total_staff: staffReports.length,
      total_present_days: staffReports.reduce((acc, r) => acc + r.present, 0),
      total_late_occurrences: staffReports.reduce((acc, r) => acc + r.late, 0),
      total_absent_days: staffReports.reduce((acc, r) => acc + r.absent, 0),
      total_hours_worked: Math.round(staffReports.reduce((acc, r) => acc + r.total_hours, 0))
    }

    return NextResponse.json({
      month,
      year,
      summary: companySummary,
      reports: staffReports
    })
  } catch (err) {
    console.error('[GET /api/attendance/report]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
