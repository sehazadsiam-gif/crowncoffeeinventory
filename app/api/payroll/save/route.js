import { NextResponse } from 'next/server'
import { supabaseAdmin, supabase } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      staff_id,
      month,
      year,
      overtime_hours,
      overtime_pay,
      service_charge,
      bonus,
      lunch_dinner,
      morning_food,
      advance_taken,
      others_taken,
      miscellaneous,
      miscellaneous_note,
      miscellaneous_plus,
      is_paid,
      manual_unpaid_days,
      waived_unpaid_days,
      absent_days,
      late_waived,
      lunch_dinner_manual,
      final_salary
    } = body

    if (!staff_id || !month || !year) {
      return NextResponse.json(
        { error: 'staff_id, month, and year are required' },
        { status: 400 }
      )
    }

    const client = supabaseAdmin || supabase

    const payload = {
      staff_id,
      month: Number(month),
      year: Number(year),
      overtime_hours: Number(overtime_hours) || 0,
      overtime_pay: Number(overtime_pay) || 0,
      service_charge: Number(service_charge) || 0,
      bonus: Number(bonus) || 0,
      lunch_dinner: Number(lunch_dinner) || 0,
      morning_food: Number(morning_food) || 0,
      advance_taken: Number(advance_taken) || 0,
      others_taken: Number(others_taken) || 0,
      miscellaneous: Number(miscellaneous) || 0,
      miscellaneous_note: miscellaneous_note || '',
      miscellaneous_plus: miscellaneous_plus ? 1 : 0,
      is_paid: Boolean(is_paid),
      manual_unpaid_days:
        manual_unpaid_days === null ||
        manual_unpaid_days === undefined ||
        manual_unpaid_days === ''
          ? null
          : Number(manual_unpaid_days),
      waived_unpaid_days: Number(waived_unpaid_days) || 0,
      absent_days: Number(absent_days) || 0,
      late_waived: Boolean(late_waived),
      lunch_dinner_manual: Boolean(lunch_dinner_manual),
      final_salary: Number(final_salary) || 0
    }

    const { data, error } = await client
      .from('payroll_entries')
      .upsert(payload, { onConflict: 'staff_id,month,year' })
      .select()

    if (error) {
      console.error('API /api/payroll/save error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, entry: data?.[0] || payload })
  } catch (err) {
    console.error('API /api/payroll/save server exception:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
