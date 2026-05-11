import { supabase } from './supabase'

export async function calculateStaffOvertime(staff_id, month, year) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data: staffData } = await supabase
    .from('staff')
    .select('base_salary, name, per_hour_rate')
    .eq('id', staff_id)
    .single()

  if (!staffData) {
    throw new Error('Staff not found')
  }

  const { data: attendanceData } = await supabase
    .from('attendance')
    .select('*')
    .eq('staff_id', staff_id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  const baseSalary = Number(staffData.base_salary) || 0
  const hourlyRate = Number(staffData.per_hour_rate) || Math.round((baseSalary / 30 / 10) * 100) / 100
  const shiftHours = 10

  let overtimeRecords = []
  let totalOvertimeHours = 0
  let totalOvertimePay = 0
  let daysWorked = 0

  for (const attendance of attendanceData || []) {
    const actualHours = calculateHours(attendance.check_in_time, attendance.check_out_time)
    const overtimeHours = Math.max(0, actualHours - shiftHours)
    const overtimePay = Math.round(overtimeHours * hourlyRate * 100) / 100

    const { data: existing } = await supabase
      .from('overtime_logs')
      .select('id')
      .eq('staff_id', staff_id)
      .eq('date', attendance.date)
      .single()
      .catch(() => ({ data: null }))

    if (existing) {
      await supabase
        .from('overtime_logs')
        .update({
          check_in: attendance.check_in_time,
          check_out: attendance.check_out_time,
          actual_hours: actualHours,
          overtime_hours: overtimeHours,
          hourly_rate: hourlyRate,
          overtime_pay: overtimePay,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('overtime_logs')
        .insert([{
          staff_id,
          date: attendance.date,
          check_in: attendance.check_in_time,
          check_out: attendance.check_out_time,
          actual_hours: actualHours,
          overtime_hours: overtimeHours,
          hourly_rate: hourlyRate,
          overtime_pay: overtimePay,
          shift_hours: shiftHours
        }])
    }

    totalOvertimeHours += overtimeHours
    totalOvertimePay += overtimePay
    daysWorked++

    overtimeRecords.push({
      date: attendance.date,
      checkIn: attendance.check_in_time,
      checkOut: attendance.check_out_time,
      actualHours: parseFloat(actualHours.toFixed(2)),
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      overtimePay: parseFloat(overtimePay.toFixed(2))
    })
  }

  // Update staff monthly totals
  await supabase
    .from('staff')
    .update({
        overtime_hours_month: Number(totalOvertimeHours.toFixed(2)),
        overtime_pay_month: Number(totalOvertimePay.toFixed(2))
    })
    .eq('id', staff_id)

  return {
    staffName: staffData.name,
    staffId: staff_id,
    baseSalary,
    hourlyRate: parseFloat(hourlyRate.toFixed(2)),
    month,
    year,
    daysWorked,
    overtimeRecords,
    totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
    totalOvertimePay: parseFloat(totalOvertimePay.toFixed(2))
  }
}

function calculateHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0

  const inParts = checkIn.split(':')
  const outParts = checkOut.split(':')

  const inHours = parseInt(inParts[0])
  const inMins = parseInt(inParts[1])
  const outHours = parseInt(outParts[0])
  const outMins = parseInt(outParts[1])

  const inTotalMins = inHours * 60 + inMins
  let outTotalMins = outHours * 60 + outMins

  if (outTotalMins < inTotalMins) {
    outTotalMins += 24 * 60
  }

  const diffMins = outTotalMins - inTotalMins
  return diffMins / 60
}
