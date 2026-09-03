import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { injectAugustBaselineLogs } from '../../../../lib/attendance-service'
import { getShiftType } from '../../attendance/report/route'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || '8', 10)
    const year = parseInt(searchParams.get('year') || '2026', 10)

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data: staff, error: sErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, shift_start, base_salary')
      .eq('is_active', true)
      .order('serial', { ascending: true })

    if (sErr) throw sErr

    const { data: rawLogs, error: lErr } = await supabaseAdmin
      .from('attendance_log')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (lErr) throw lErr

    const logs = injectAugustBaselineLogs(rawLogs || [], staff || [], startDate, endDate)
    const { data: payrollEntries, error: pErr } = await supabaseAdmin
      .from('payroll_entries')
      .select('*')
      .eq('month', month)
      .eq('year', year)

    if (pErr) throw pErr

    const results = []

    for (const s of staff || []) {
      const sLogs = (logs || []).filter(l => l.staff_id === s.id && (l.status === 'present' || l.status === 'late'))
      let morningDays = 0
      let nightDays = 0

      sLogs.forEach(l => {
        const st = getShiftType(l, s.shift_start)
        if (st === 'morning') morningDays++
        else nightDays++
      })

      const morningFood = morningDays * 110
      const lunchDinner = nightDays * 140

      const existing = (payrollEntries || []).find(p => p.staff_id === s.id)
      if (!existing) continue

      const base = Number(s.base_salary) || 0
      const otPay = Number(existing.overtime_pay || 0)
      const sc = Number(existing.service_charge || 0)
      const bonus = Number(existing.bonus || 0)
      const misc = Number(existing.miscellaneous || 0)
      const adv = Number(existing.advance_taken || 0)
      const others = Number(existing.others_taken || 0)
      const unpaidDeduction = Number(existing.unpaid_leave_deduction || 0)
      const lateDeduction = Number(existing.late_deduction || 0)

      const netSalary = Math.max(0, base + otPay + sc + bonus + lunchDinner + morningFood + misc - adv - others - unpaidDeduction - lateDeduction)

      const { data: updated, error: uErr } = await supabaseAdmin
        .from('payroll_entries')
        .update({
          morning_food: morningFood,
          lunch_dinner: lunchDinner,
          final_salary: netSalary,
          lunch_dinner_manual: false
        })
        .eq('id', existing.id)
        .select('id, staff_id, morning_food, lunch_dinner, final_salary')

      results.push({
        name: s.name,
        total_present: sLogs.length,
        morning_days: morningDays,
        morning_food: morningFood,
        night_days: nightDays,
        lunch_dinner: lunchDinner,
        final_salary: netSalary,
        error: uErr?.message || null
      })
    }

    return NextResponse.json({ success: true, month, year, results })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
