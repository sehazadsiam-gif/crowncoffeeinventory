import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

const FOOD_ALLOWANCE_DATA = [
  { staff_id: 'd4c47a39-da06-4823-95f6-3725cc7ea02f', name: 'Abdullah Sarker', morning_days: 13, night_days: 7, morning_food: 1430, lunch_dinner: 980, final_salary: 12109 },
  { staff_id: '833faa35-b2b4-4542-9460-764d43f0e61b', name: 'Ajoy', morning_days: 8, night_days: 0, morning_food: 880, lunch_dinner: 0, final_salary: 4886 },
  { staff_id: 'fc267adb-582a-4617-b932-ebf34b8b593a', name: 'Esa (Pickup Man)', morning_days: 13, night_days: 10, morning_food: 1430, lunch_dinner: 1400, final_salary: 13323 },
  { staff_id: 'd9a874b6-768d-42d8-b3f2-6ecfbe008775', name: 'Esa (Dishwasher)', morning_days: 10, night_days: 0, morning_food: 1100, lunch_dinner: 0, final_salary: 5772 },
  { staff_id: 'fa6ad958-3671-435c-9f31-493b6326ea25', name: 'Hafizur', morning_days: 17, night_days: 5, morning_food: 1870, lunch_dinner: 700, final_salary: 15052 },
  { staff_id: 'ecb1f64a-c15c-4bec-b5e1-97b82cd3d009', name: 'Rafat', morning_days: 22, night_days: 1, morning_food: 2420, lunch_dinner: 140, final_salary: 20596 },
  { staff_id: '899ed65e-a11d-42ce-a45b-ad51b42648cd', name: 'Ripon', morning_days: 8, night_days: 1, morning_food: 880, lunch_dinner: 140, final_salary: 3181 },
  { staff_id: '808d17e2-8e73-46af-a473-682cddb5c945', name: 'Shahadat', morning_days: 19, night_days: 3, morning_food: 2090, lunch_dinner: 420, final_salary: 20230 },
  { staff_id: 'cdf26b9d-2e76-4b88-9172-f50f5640a7a1', name: 'Shamshul Alam', morning_days: 11, night_days: 9, morning_food: 1210, lunch_dinner: 1260, final_salary: 9200 }
]

export async function GET(request) {
  try {
    const results = []

    for (const item of FOOD_ALLOWANCE_DATA) {
      const { data, error } = await supabaseAdmin
        .from('payroll_entries')
        .update({
          morning_food: item.morning_food,
          lunch_dinner: item.lunch_dinner,
          final_salary: item.final_salary
        })
        .eq('staff_id', item.staff_id)
        .eq('month', 8)
        .eq('year', 2026)
        .select('id, staff_id, morning_food, lunch_dinner, final_salary')

      results.push({ name: item.name, data, error: error?.message || null })
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
