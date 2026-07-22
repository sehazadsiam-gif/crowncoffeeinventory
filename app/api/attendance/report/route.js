import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || new Date().getFullYear())

    // Support optional custom date range (from/to) for daily breakdown
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    const startDate = fromParam || `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = toParam || `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

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
      .order('date', { ascending: true })

    if (logsErr) throw logsErr

    // Map daily logs with readable format e.g. "19 July, 2026", "8:00am - 7:15pm"
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    
    const staffMap = {}
    ;(staff || []).forEach(s => { staffMap[s.id] = s })

    const dailyLogs = (logs || []).map(l => {
      const s = staffMap[l.staff_id] || {}
      const d = new Date(l.date)
      const dayNum = d.getDate()
      const monthName = monthNames[d.getMonth()]
      const formattedDate = `${dayNum} ${monthName}, ${d.getFullYear()}`

      const checkInTime = l.check_in_at
        ? new Date(l.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
        : null

      const checkOutTime = l.check_out_at
        ? new Date(l.check_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
        : null

      let timeRange = '--'
      if (checkInTime && checkOutTime) {
        timeRange = `${checkInTime} - ${checkOutTime}`
      } else if (checkInTime) {
        timeRange = `${checkInTime} (Checked In)`
      }

      const totalMins = Math.round((l.hours_worked || 0) * 60)
      const overtimeMins = l.overtime_minutes || Math.max(0, totalMins - 600)
      const overtimeHours = Math.round((overtimeMins / 60) * 100) / 100

      return {
        id: l.id,
        staff_id: l.staff_id,
        staff_name: s.name || l.employee_id || 'Staff',
        employee_id: s.employee_id || l.employee_id || 'N/A',
        designation: s.designation || '',
        date: l.date,
        date_formatted: formattedDate,
        check_in_at: l.check_in_at,
        check_out_at: l.check_out_at,
        check_in_formatted: checkInTime || '--',
        check_out_formatted: checkOutTime || '--',
        time_range: timeRange,
        status: l.status || 'present',
        minutes_late: l.minutes_late || 0,
        hours_worked: l.hours_worked || 0,
        overtime_minutes: overtimeMins,
        overtime_hours: overtimeHours,
        notes: l.notes || ''
      }
    })

    const staffReports = (staff || []).map(s => {
      const sLogs = (logs || []).filter(l => l.staff_id === s.id)

      const present = sLogs.filter(l => l.status === 'present').length
      const late = sLogs.filter(l => l.status === 'late').length
      const absent = sLogs.filter(l => l.status === 'absent').length
      const onLeave = sLogs.filter(l => l.status === 'on_leave').length
      const off = sLogs.filter(l => l.status === 'off').length
      const totalHours = Math.round(sLogs.reduce((sum, l) => sum + (l.hours_worked || 0), 0) * 10) / 10
      const totalLateMinutes = sLogs.reduce((sum, l) => sum + (l.minutes_late || 0), 0)
      const totalOvertimeMinutes = sLogs.reduce((sum, l) => sum + (l.overtime_minutes || Math.max(0, Math.round((l.hours_worked || 0) * 60) - 600)), 0)
      const totalOvertimeHours = Math.round((totalOvertimeMinutes / 60) * 100) / 100

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
        total_late_minutes: totalLateMinutes,
        total_overtime_hours: totalOvertimeHours
      }
    })

    const companySummary = {
      month,
      year,
      total_staff: staffReports.length,
      total_present_days: staffReports.reduce((acc, r) => acc + r.total_days_worked, 0),
      total_late_occurrences: staffReports.reduce((acc, r) => acc + r.late, 0),
      total_absent_days: staffReports.reduce((acc, r) => acc + r.absent, 0),
      total_hours_worked: Math.round(staffReports.reduce((acc, r) => acc + r.total_hours, 0)),
      total_overtime_hours: Math.round(staffReports.reduce((acc, r) => acc + r.total_overtime_hours, 0) * 10) / 10
    }

    return NextResponse.json({
      month,
      year,
      summary: companySummary,
      reports: staffReports,
      daily_logs: dailyLogs
    })
  } catch (err) {
    console.error('[GET /api/attendance/report]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, log_id, month, year, ...payload } = body

    if (action === 'update_log') {
      const { check_in_at, check_out_at, status, minutes_late, notes } = payload
      
      let hoursWorked = 0
      let overtimeMins = 0

      if (check_in_at && check_out_at) {
        const inDate = new Date(check_in_at)
        const outDate = new Date(check_out_at)
        const totalMins = Math.max(0, Math.floor((outDate - inDate) / (1000 * 60)))
        hoursWorked = Math.round((totalMins / 60) * 100) / 100
        overtimeMins = Math.max(0, totalMins - 600)
      }

      const updateData = {
        status: status || 'present',
        minutes_late: Number(minutes_late || 0),
        hours_worked: hoursWorked,
        overtime_minutes: overtimeMins,
        notes: notes || null,
        updated_at: new Date().toISOString()
      }

      if (check_in_at) updateData.check_in_at = check_in_at
      if (check_out_at) updateData.check_out_at = check_out_at

      const { error } = await supabaseAdmin
        .from('attendance_log')
        .update(updateData)
        .eq('id', log_id)

      if (error) throw error

      return NextResponse.json({ success: true, message: 'Daily attendance log updated successfully' })
    }

    if (action === 'apply_to_payroll') {
      const m = parseInt(month)
      const y = parseInt(year)
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`
      const lastDay = new Date(y, m, 0).getDate()
      const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const { data: staffList } = await supabaseAdmin.from('staff').select('id, name, employee_id').eq('is_active', true)
      const { data: logs } = await supabaseAdmin.from('attendance_log').select('*').gte('date', startDate).lte('date', endDate)

      const summaryUpserts = (staffList || []).map(s => {
        const sLogs = (logs || []).filter(l => l.staff_id === s.id)
        const present = sLogs.filter(l => l.status === 'present').length
        const late = sLogs.filter(l => l.status === 'late').length
        const absent = sLogs.filter(l => l.status === 'absent').length
        const onLeave = sLogs.filter(l => l.status === 'on_leave').length
        const totalHours = Math.round(sLogs.reduce((sum, l) => sum + (l.hours_worked || 0), 0) * 10) / 10
        const totalLateMins = sLogs.reduce((sum, l) => sum + (l.minutes_late || 0), 0)
        const totalOtMins = sLogs.reduce((sum, l) => sum + (l.overtime_minutes || Math.max(0, Math.round((l.hours_worked || 0) * 60) - 600)), 0)

        return {
          staff_id: s.id,
          month: m,
          year: y,
          present_days: present + late,
          late_days: late,
          absent_days: absent,
          updated_at: new Date().toISOString()
        }
      })

      if (summaryUpserts.length > 0) {
        const { error: upsertErr } = await supabaseAdmin
          .from('monthly_attendance_summary')
          .upsert(summaryUpserts, { onConflict: 'staff_id,month,year' })

        if (upsertErr) throw upsertErr
      }

      return NextResponse.json({
        success: true,
        message: `Applied ${month}/${year} attendance report to Payroll successfully (${summaryUpserts.length} staff updated)`
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('[POST /api/attendance/report]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
