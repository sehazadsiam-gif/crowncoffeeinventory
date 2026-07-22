import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const { date, notes = 'Holiday / Cafe Closed' } = await request.json()
    if (!date) {
      return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 })
    }

    // Get all active staff
    const { data: staffList, error: staffErr } = await supabaseAdmin
      .from('staff')
      .select('id, employee_id')
      .eq('is_active', true)

    if (staffErr) throw staffErr

    let count = 0
    for (const staff of staffList || []) {
      const { data: existing } = await supabaseAdmin
        .from('attendance_log')
        .select('id')
        .eq('staff_id', staff.id)
        .eq('date', date)
        .maybeSingle()

      const payload = {
        staff_id: staff.id,
        employee_id: staff.employee_id,
        date: date,
        status: 'off',
        hours_worked: 0,
        minutes_late: 0,
        notes: notes,
        updated_at: new Date().toISOString()
      }

      if (existing) {
        await supabaseAdmin.from('attendance_log').update(payload).eq('id', existing.id)
      } else {
        await supabaseAdmin.from('attendance_log').insert(payload)
      }
      count++
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${count} staff members as 'Day Off' for ${date}.`,
      date
    })
  } catch (err) {
    console.error('[bulk-dayoff API]', err)
    return NextResponse.json({ error: err.message || 'Bulk day-off failed' }, { status: 500 })
  }
}
