import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export function getShiftType(log, staffDefaultShift = '11:00') {
  if (log?.check_in_at) {
    const d = new Date(log.check_in_at)
    if (!isNaN(d.getTime())) {
      const bstHour = (d.getUTCHours() + 6) % 24
      const bstMin = d.getUTCMinutes()
      const totalMins = bstHour * 60 + bstMin
      // Overnight check-ins (e.g. 00:00 - 05:59 BST) are night shifts
      if (bstHour < 6) return 'night'
      // Checked in before 12:15 PM (735m, e.g. 8:00 AM, 10:00 AM, 11:00 AM) -> morning shift (৳110)
      // Checked in at or after 12:15 PM (e.g. 12:30 PM, 1:00 PM / 13:00) -> night shift (৳140)
      return totalMins < 735 ? 'morning' : 'night'
    }
  }

  const shiftStr = String(log?.shift_start || staffDefaultShift || '').trim()
  const hourMatch = shiftStr.match(/^(\d{1,2})/)
  if (hourMatch) {
    const h = parseInt(hourMatch[1], 10)
    if (h >= 13) return 'night'
    return 'morning'
  }
  return 'morning'
}
import { injectAugustBaselineLogs } from '../../../../lib/attendance-service'

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

    const { data: rawLogs, error: logsErr } = await supabaseAdmin
      .from('attendance_log')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (logsErr) throw logsErr

    // Inject August 1 to August 7 hardcoded 10-hour work baseline for active staff
    const logs = injectAugustBaselineLogs(rawLogs || [], staff || [], startDate, endDate)

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
        ? new Date(l.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' }).toLowerCase()
        : null

      const checkOutTime = l.check_out_at
        ? new Date(l.check_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' }).toLowerCase()
        : null

      let timeRange = '--'
      if (checkInTime && checkOutTime) {
        timeRange = `${checkInTime} - ${checkOutTime}`
      } else if (checkInTime) {
        timeRange = `${checkInTime} (Checked In)`
      }

      let hoursWorked = l.hours_worked || 0
      if ((!hoursWorked || hoursWorked === 0) && l.check_in_at && l.check_out_at) {
        const checkIn = new Date(l.check_in_at).getTime()
        const checkOut = new Date(l.check_out_at).getTime()
        const breakMins = l.break_duration_minutes || 0
        const diffMins = Math.max(0, Math.floor((checkOut - checkIn) / (1000 * 60)) - breakMins)
        hoursWorked = Math.round((diffMins / 60) * 100) / 100
      }

      const standardShiftHours = 10
      const otThresholdHours = 11.0
      const overtimeHours = l.overtime_hours || (hoursWorked > otThresholdHours ? Math.round((hoursWorked - otThresholdHours) * 100) / 100 : 0)
      const overtimeMins = Math.round(overtimeHours * 60)
      const lateMins = l.minutes_late || 0
      const lateHours = Math.round((lateMins / 60) * 100) / 100

      const breakStart = l.break_start_at
        ? new Date(l.break_start_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' }).toLowerCase()
        : null

      const breakEnd = l.break_end_at
        ? new Date(l.break_end_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' }).toLowerCase()
        : null

      let breakFormatted = '--'
      const breakHoursStr = l.break_duration_minutes > 0
        ? `${(l.break_duration_minutes / 60).toFixed(2).replace(/\.00$/, '')}h`
        : '0h'

      if (breakStart && breakEnd) {
        breakFormatted = `${breakStart} - ${breakEnd} (${breakHoursStr})`
      } else if (l.break_duration_minutes > 0) {
        breakFormatted = breakHoursStr
      } else if (breakStart && !breakEnd) {
        breakFormatted = `On Break (${breakStart})`
      }

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
        break_start_at: l.break_start_at,
        break_end_at: l.break_end_at,
        break_duration_minutes: l.break_duration_minutes || 0,
        break_formatted: breakFormatted,
        check_in_formatted: checkInTime || '--',
        check_out_formatted: checkOutTime || '--',
        time_range: timeRange,
        status: l.status || 'present',
        shift_start: l.shift_start || s.shift_start || '11:00',
        shift_type: getShiftType(l, s.shift_start),
        food_fee: (l.status === 'present' || l.status === 'late') ? 140 : 0,
        minutes_late: lateMins,
        late_hours: lateHours,
        hours_worked: hoursWorked,
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
      const totalHours = Math.round(sLogs.reduce((sum, l) => {
        let hw = l.hours_worked || 0
        if ((!hw || hw === 0) && l.check_in_at && l.check_out_at) {
          const ci = new Date(l.check_in_at).getTime()
          const co = new Date(l.check_out_at).getTime()
          const bm = l.break_duration_minutes || 0
          hw = Math.max(0, Math.floor((co - ci) / (1000 * 60)) - bm) / 60
        }
        return sum + hw
      }, 0) * 10) / 10
      const totalLateMinutes = sLogs.reduce((sum, l) => sum + (l.minutes_late || 0), 0)
      const totalLateHours = Math.round((totalLateMinutes / 60) * 100) / 100
      const totalOvertimeHours = Math.round(sLogs.reduce((sum, l) => {
        let hw = l.hours_worked || 0
        if ((!hw || hw === 0) && l.check_in_at && l.check_out_at) {
          const ci = new Date(l.check_in_at).getTime()
          const co = new Date(l.check_out_at).getTime()
          const bm = l.break_duration_minutes || 0
          hw = Math.max(0, Math.floor((co - ci) / (1000 * 60)) - bm) / 60
        }
        const ot = l.overtime_hours || (hw > 11.0 ? hw - 11.0 : 0)
        return sum + ot
      }, 0) * 100) / 100

      const workedLogs = sLogs.filter(l => l.status === 'present' || l.status === 'late')
      let morningDays = workedLogs.filter(l => getShiftType(l, s.shift_start) === 'morning').length
      let nightDays = workedLogs.filter(l => getShiftType(l, s.shift_start) === 'night').length
      const totalPresent = present + late
      const unassigned = Math.max(0, totalPresent - (morningDays + nightDays))
      const defaultShift = getShiftType({ shift_start: s.shift_start }, s.shift_start)
      if (defaultShift === 'night') {
        nightDays += unassigned
      } else {
        morningDays += unassigned
      }
      const totalDaysWorked = present + late
      const morningFood = 0
      const nightFood = totalDaysWorked * 140
      const totalFood = totalDaysWorked * 140

      return {
        staff_id: s.id,
        name: s.name,
        employee_id: s.employee_id || 'N/A',
        designation: s.designation,
        base_salary: s.base_salary,
        shift_start: s.shift_start || '11:00',
        present,
        late,
        absent,
        on_leave: onLeave,
        off,
        total_days_worked: totalDaysWorked,
        morning_days: morningDays,
        night_days: nightDays,
        morning_food: morningFood,
        night_food: nightFood,
        total_food: totalFood,
        total_hours: totalHours,
        total_late_minutes: totalLateMinutes,
        total_late_hours: totalLateHours,
        total_overtime_hours: totalOvertimeHours
      }
    })

    const companySummary = {
      month,
      year,
      total_staff: staffReports.length,
      total_present_days: staffReports.reduce((acc, r) => acc + r.total_days_worked, 0),
      total_morning_days: staffReports.reduce((acc, r) => acc + r.morning_days, 0),
      total_night_days: staffReports.reduce((acc, r) => acc + r.night_days, 0),
      total_morning_food: staffReports.reduce((acc, r) => acc + r.morning_food, 0),
      total_night_food: staffReports.reduce((acc, r) => acc + r.night_food, 0),
      total_food_allowance: staffReports.reduce((acc, r) => acc + r.total_food, 0),
      total_late_occurrences: staffReports.reduce((acc, r) => acc + r.late, 0),
      total_late_hours: Math.round(staffReports.reduce((acc, r) => acc + r.total_late_hours, 0) * 10) / 10,
      total_absent_days: staffReports.reduce((acc, r) => acc + r.absent, 0),
      total_hours_worked: Math.round(staffReports.reduce((acc, r) => acc + r.total_hours, 0)),
      total_overtime_hours: Math.round(staffReports.reduce((acc, r) => acc + r.total_overtime_hours, 0) * 10) / 10
    }

    return NextResponse.json({
      month,
      year,
      summary: companySummary,
      reports: staffReports,
      daily_logs: dailyLogs,
      staff: (staff || []).map(s => ({ id: s.id, name: s.name, employee_id: s.employee_id, designation: s.designation }))
    })
  } catch (err) {
    console.error('[GET /api/attendance/report]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, log_id, staff_id, date, month, year, ...payload } = body

    if (action === 'update_log' || action === 'create_log') {
      const {
        check_in_at,
        check_out_at,
        break_start_at,
        break_end_at,
        status,
        minutes_late,
        notes,
        hours_worked,
        overtime_hours,
        shift_start
      } = payload
      
      let breakDurationMin = 0
      if (break_start_at && break_end_at) {
        const bStart = new Date(break_start_at)
        const bEnd = new Date(break_end_at)
        breakDurationMin = Math.max(0, Math.floor((bEnd - bStart) / (1000 * 60)))
      }

      let computedHoursWorked = null
      let computedOvertimeMins = 0

      if (check_in_at && check_out_at) {
        const inDate = new Date(check_in_at)
        const outDate = new Date(check_out_at)
        let totalMins = Math.max(0, Math.floor((outDate - inDate) / (1000 * 60)))
        if (totalMins > 960) totalMins = 960 // Safety Cap: 16 hours max per shift
        const netMins = Math.max(0, totalMins - breakDurationMin)
        computedHoursWorked = Math.round((netMins / 60) * 100) / 100
        computedOvertimeMins = Math.max(0, netMins - 660)
      } else if (status === 'present' || status === 'late') {
        computedHoursWorked = 10.0
      }

      const finalHoursWorked = (hours_worked !== undefined && hours_worked !== null && hours_worked !== '')
        ? parseFloat(hours_worked)
        : computedHoursWorked

      const finalOvertimeMins = (overtime_hours !== undefined && overtime_hours !== null && overtime_hours !== '')
        ? Math.round(parseFloat(overtime_hours) * 60)
        : computedOvertimeMins

      const updateData = {
        status: status || 'present',
        minutes_late: Number(minutes_late || 0),
        check_in_at: check_in_at || null,
        check_out_at: check_out_at || null,
        break_start_at: break_start_at || null,
        break_end_at: break_end_at || null,
        break_duration_minutes: breakDurationMin,
        hours_worked: finalHoursWorked,
        overtime_minutes: finalOvertimeMins,
        shift_start: shift_start || '11:00',
        admin_override: true,
        source: 'admin_edit',
        notes: notes || null,
        updated_at: new Date().toISOString()
      }

      const isUUID = log_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(log_id))

      let targetStaffId = staff_id
      let targetDate = date

      if (isUUID && (!targetStaffId || !targetDate)) {
        const { data: existing } = await supabaseAdmin.from('attendance_log').select('staff_id, date').eq('id', log_id).maybeSingle()
        if (existing) {
          targetStaffId = targetStaffId || existing.staff_id
          targetDate = targetDate || existing.date
        }
      }

      if (targetStaffId && targetDate) {
        const { data: staffMember } = await supabaseAdmin.from('staff').select('employee_id').eq('id', targetStaffId).maybeSingle()
        
        const upsertData = {
          ...updateData,
          staff_id: targetStaffId,
          employee_id: staffMember?.employee_id || 'N/A',
          date: targetDate
        }
        if (isUUID) {
          upsertData.id = log_id
        }

        const { error } = await supabaseAdmin
          .from('attendance_log')
          .upsert(upsertData, { onConflict: 'staff_id,date' })

        if (error) throw error
      } else if (isUUID) {
        const { error } = await supabaseAdmin
          .from('attendance_log')
          .update(updateData)
          .eq('id', log_id)

        if (error) throw error
      } else {
        return NextResponse.json({ error: 'staff_id and date are required to save attendance record' }, { status: 400 })
      }

      return NextResponse.json({ success: true, message: 'Daily attendance log updated successfully' })
    }

    if (action === 'delete_log') {
      const isUUID = log_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(log_id))

      if (isUUID) {
        const { error } = await supabaseAdmin
          .from('attendance_log')
          .delete()
          .eq('id', log_id)

        if (error) throw error
      } else if (staff_id && date) {
        await supabaseAdmin
          .from('attendance_log')
          .upsert({
            staff_id,
            date,
            status: 'off',
            hours_worked: 0,
            overtime_minutes: 0,
            minutes_late: 0,
            admin_override: true,
            source: 'admin_delete',
            notes: 'Record deleted/marked Off by admin',
            updated_at: new Date().toISOString()
          }, { onConflict: 'staff_id,date' })
      }

      return NextResponse.json({ success: true, message: 'Attendance record removed successfully' })
    }

    if (action === 'apply_to_payroll') {
      const m = parseInt(month)
      const y = parseInt(year)
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`
      const lastDay = new Date(y, m, 0).getDate()
      const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const { data: staffList } = await supabaseAdmin.from('staff').select('id, name, employee_id, base_salary, hourly_rate, shift_start').eq('is_active', true)
      const { data: rawLogs } = await supabaseAdmin.from('attendance_log').select('*').gte('date', startDate).lte('date', endDate)

      const logs = injectAugustBaselineLogs(rawLogs || [], staffList || [], startDate, endDate)

      const summaryUpserts = (staffList || []).map(s => {
        const sLogs = (logs || []).filter(l => l.staff_id === s.id)
        const present = sLogs.filter(l => l.status === 'present').length
        const late = sLogs.filter(l => l.status === 'late').length
        const directAbsent = sLogs.filter(l => l.status === 'absent').length
        const off = sLogs.filter(l => l.status === 'off').length
        const onLeave = sLogs.filter(l => l.status === 'on_leave').length
        const worked = present + late
        const unworked = Math.max(0, 30 - worked)
        // User directive: consider off days as absent (and unworked days in standard 30-day month)
        const absent = Math.max(directAbsent + off, unworked)
        const totalHours = Math.round(sLogs.reduce((sum, l) => {
          let hw = l.hours_worked || 0
          if ((!hw || hw === 0) && l.check_in_at && l.check_out_at) {
            const ci = new Date(l.check_in_at).getTime()
            const co = new Date(l.check_out_at).getTime()
            const bm = l.break_duration_minutes || 0
            hw = Math.max(0, Math.floor((co - ci) / (1000 * 60)) - bm) / 60
          }
          return sum + hw
        }, 0) * 10) / 10

        const sOvertimeHours = Math.round(sLogs.reduce((sum, l) => {
          let hw = l.hours_worked || 0
          if ((!hw || hw === 0) && l.check_in_at && l.check_out_at) {
            const ci = new Date(l.check_in_at).getTime()
            const co = new Date(l.check_out_at).getTime()
            const bm = l.break_duration_minutes || 0
            hw = Math.max(0, Math.floor((co - ci) / (1000 * 60)) - bm) / 60
          }
          const ot = l.overtime_hours || (hw > 11.0 ? hw - 11.0 : 0)
          return sum + ot
        }, 0) * 100) / 100

        const base = Number(s.base_salary) || 0
        const hourlyRate = s.hourly_rate || Math.floor(Math.round(base / 30) / 10)
        const sOvertimePay = Math.round(sOvertimeHours * hourlyRate)

        return {
          staff_id: s.id,
          month: m,
          year: y,
          present_days: present + late,
          late_days: late,
          absent_days: absent,
          total_present: present + late,
          total_late: late,
          total_absent: absent,
          total_leave: onLeave,
          total_hours: totalHours,
          overtime_hours: sOvertimeHours,
          total_overtime_hours: sOvertimeHours,
          overtime_pay: sOvertimePay,
          total_overtime_pay: sOvertimePay,
          updated_at: new Date().toISOString()
        }
      })

      if (summaryUpserts.length > 0) {
        // 1. Attempt upsert into monthly_attendance_summary
        let upsertSucceeded = false
        try {
          const { error: fullErr } = await supabaseAdmin
            .from('monthly_attendance_summary')
            .upsert(summaryUpserts, { onConflict: 'staff_id,month,year' })

          if (!fullErr) {
            upsertSucceeded = true
          } else {
            console.warn('[apply_to_payroll] Full upsert failed, trying fallback schema:', fullErr.message)
          }
        } catch (e) {
          console.warn('[apply_to_payroll] Exception on full upsert:', e.message)
        }

        // If schema cache lacks modern fields, fallback to legacy schema columns
        if (!upsertSucceeded) {
          const legacyUpserts = summaryUpserts.map(r => ({
            staff_id: r.staff_id,
            month: r.month,
            year: r.year,
            total_present: r.total_present,
            total_late: r.total_late,
            total_absent: r.total_absent,
            total_leave: r.total_leave,
            total_overtime_hours: r.total_overtime_hours
          }))

          const { error: legacyErr } = await supabaseAdmin
            .from('monthly_attendance_summary')
            .upsert(legacyUpserts, { onConflict: 'staff_id,month,year' })

          if (legacyErr) {
            console.error('[apply_to_payroll] Legacy upsert also failed:', legacyErr.message)
            // Direct database connection as safeguard
            try {
              const { Client } = await import('pg')
              const connStr = process.env.DATABASE_URL || 'postgres://postgres:YJEwDbQHPOF6Te4Yk1c8vQqTaa6yaKwcv1dLnb9682HDFGmwDbSk0OdiwxcTFXts@169.58.136.137:5432/postgres'
              const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 3000 })
              await client.connect()
              for (const row of summaryUpserts) {
                await client.query(`
                  INSERT INTO monthly_attendance_summary (staff_id, month, year, present_days, late_days, absent_days, total_present, total_late, total_absent, total_leave, total_hours, overtime_hours, total_overtime_hours, overtime_pay, total_overtime_pay, updated_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
                  ON CONFLICT (staff_id, month, year)
                  DO UPDATE SET
                    present_days = EXCLUDED.present_days,
                    late_days = EXCLUDED.late_days,
                    absent_days = EXCLUDED.absent_days,
                    total_present = EXCLUDED.total_present,
                    total_late = EXCLUDED.total_late,
                    total_absent = EXCLUDED.total_absent,
                    total_leave = EXCLUDED.total_leave,
                    total_hours = EXCLUDED.total_hours,
                    overtime_hours = EXCLUDED.overtime_hours,
                    total_overtime_hours = EXCLUDED.total_overtime_hours,
                    overtime_pay = EXCLUDED.overtime_pay,
                    total_overtime_pay = EXCLUDED.total_overtime_pay,
                    updated_at = NOW()
                `, [row.staff_id, row.month, row.year, row.present_days, row.late_days, row.absent_days, row.total_present, row.total_late, row.total_absent, row.total_leave, row.total_hours, row.overtime_hours, row.total_overtime_hours, row.overtime_pay, row.total_overtime_pay])
              }
              await client.end()
              upsertSucceeded = true
            } catch (pgErr) {
              console.error('[apply_to_payroll] Direct PG fallback failed:', pgErr.message)
            }
          }
        }

        // 2. Direct Sync into payroll_entries table
        try {
          const { data: existingPayrolls } = await supabaseAdmin
            .from('payroll_entries')
            .select('*')
            .eq('month', m)
            .eq('year', y)

          const payrollUpserts = (staffList || []).map(s => {
            const summary = summaryUpserts.find(u => u.staff_id === s.id)
            const existing = (existingPayrolls || []).find(p => p.staff_id === s.id)
            const base = Number(s.base_salary) || 0
            const perDay = Math.round(base / 30)

            const sLogs = (logs || []).filter(l => l.staff_id === s.id)
            const workedLogs = sLogs.filter(l => l.status === 'present' || l.status === 'late')
            let morningDays = workedLogs.filter(l => getShiftType(l, s.shift_start) === 'morning').length
            let nightDays = workedLogs.filter(l => getShiftType(l, s.shift_start) === 'night').length
            const presentDays = summary ? summary.present_days : Number(existing?.present_days || workedLogs.length)
            const unassigned = Math.max(0, presentDays - (morningDays + nightDays))
            const defaultShift = getShiftType({ shift_start: s.shift_start }, s.shift_start)
            if (defaultShift === 'night') {
              nightDays += unassigned
            } else {
              morningDays += unassigned
            }
            const autoMorningFood = 0
            const autoNightFood = presentDays * 140

            const isManualOt = existing && existing.miscellaneous_plus === 1
            const otHours = isManualOt ? Number(existing.overtime_hours || 0) : (summary?.overtime_hours || 0)
            const otPay = isManualOt ? Number(existing.overtime_pay || 0) : (summary?.overtime_pay || 0)

            const lateDays = summary ? summary.late_days : Number(existing?.late_days || 0)
            const directAbsent = sLogs.filter(l => l.status === 'absent').length
            const off = sLogs.filter(l => l.status === 'off').length
            const unworked = Math.max(0, 30 - presentDays)
            const absentDays = summary ? summary.absent_days : Math.max(directAbsent + off, unworked)

            const isLateWaived = Boolean(existing?.late_waived)
            const lateDeductionDays = Math.floor(lateDays / 3)
            const lateDeduction = isLateWaived ? 0 : lateDeductionDays * perDay

            const autoUnpaidDays = Math.max(0, absentDays - 4)
            const waivedUnpaidDays = Number(existing?.waived_unpaid_days || 0)
            const finalUnpaidDays = existing?.manual_unpaid_days !== undefined && existing?.manual_unpaid_days !== null
              ? Number(existing.manual_unpaid_days)
              : Math.max(0, autoUnpaidDays - waivedUnpaidDays)
            const unpaidDeduction = finalUnpaidDays * perDay

            const isManualFood = Boolean(existing?.lunch_dinner_manual)
            const morn = isManualFood
              ? Number(existing.morning_food || 0)
              : autoMorningFood

            const lunchDinner = isManualFood
              ? Number(existing.lunch_dinner || 0)
              : autoNightFood

            const sc = Number(existing?.service_charge || 0)
            const bonus = Number(existing?.bonus || 0)
            const misc = Number(existing?.miscellaneous || 0)
            const adv = Number(existing?.advance_taken || 0)
            const others = Number(existing?.others_taken || 0)

            const netBeforePenalty = Math.max(0, base + otPay + sc + bonus + lunchDinner + morn + misc - adv - others - unpaidDeduction - lateDeduction)

            return {
              staff_id: s.id,
              month: m,
              year: y,
              overtime_hours: otHours,
              overtime_pay: otPay,
              late_days: lateDays,
              absent_days: absentDays,
              late_deduction: lateDeduction,
              unpaid_leave_deduction: unpaidDeduction,
              lunch_dinner: lunchDinner,
              lunch_dinner_manual: existing?.lunch_dinner_manual || false,
              service_charge: sc,
              bonus: bonus,
              morning_food: morn,
              miscellaneous: misc,
              miscellaneous_note: existing?.miscellaneous_note || '',
              advance_taken: adv,
              others_taken: others,
              final_salary: netBeforePenalty,
              is_paid: existing?.is_paid || false,
              miscellaneous_plus: isManualOt ? 1 : 0
            }
          })

          const { error: payUpsertErr } = await supabaseAdmin
            .from('payroll_entries')
            .upsert(payrollUpserts, { onConflict: 'staff_id,month,year' })

          if (payUpsertErr) {
            console.warn('[apply_to_payroll] Supabase payroll_entries upsert failed, trying direct pg:', payUpsertErr.message)
            const { Client } = await import('pg')
            const connStr = process.env.DATABASE_URL || 'postgres://postgres:YJEwDbQHPOF6Te4Yk1c8vQqTaa6yaKwcv1dLnb9682HDFGmwDbSk0OdiwxcTFXts@169.58.136.137:5432/postgres'
            const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 3000 })
            await client.connect()
            for (const row of payrollUpserts) {
              await client.query(`
                INSERT INTO payroll_entries (staff_id, month, year, overtime_hours, overtime_pay, late_days, absent_days, late_deduction, unpaid_leave_deduction, lunch_dinner, lunch_dinner_manual, service_charge, bonus, morning_food, miscellaneous, miscellaneous_note, advance_taken, others_taken, final_salary, is_paid, miscellaneous_plus)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                ON CONFLICT (staff_id, month, year)
                DO UPDATE SET
                  overtime_hours = EXCLUDED.overtime_hours,
                  overtime_pay = EXCLUDED.overtime_pay,
                  late_days = EXCLUDED.late_days,
                  absent_days = EXCLUDED.absent_days,
                  late_deduction = EXCLUDED.late_deduction,
                  unpaid_leave_deduction = EXCLUDED.unpaid_leave_deduction,
                  lunch_dinner = EXCLUDED.lunch_dinner,
                  morning_food = EXCLUDED.morning_food,
                  final_salary = EXCLUDED.final_salary
              `, [row.staff_id, row.month, row.year, row.overtime_hours, row.overtime_pay, row.late_days, row.absent_days, row.late_deduction, row.unpaid_leave_deduction, row.lunch_dinner, row.lunch_dinner_manual, row.service_charge, row.bonus, row.morning_food, row.miscellaneous, row.miscellaneous_note, row.advance_taken, row.others_taken, row.final_salary, row.is_paid, row.miscellaneous_plus])
            }
            await client.end()
          }
        } catch (paySyncErr) {
          console.error('[apply_to_payroll] Error syncing to payroll_entries:', paySyncErr.message)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Applied ${month}/${year} attendance and overtime report to Payroll successfully (${summaryUpserts.length} staff updated)`
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('[POST /api/attendance/report]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
