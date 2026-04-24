import { supabase } from '../../../../lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { month, year, records } = await req.json()

    if (!month || !year || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const upsertData = records.map(r => ({
      staff_id: r.staff_id,
      month: parseInt(month),
      year: parseInt(year),
      present_days: parseInt(r.present_days) || 0,
      absent_days: parseInt(r.absent_days) || 0,
      late_days: parseInt(r.late_days) || 0,
      source: 'rysenova',
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('monthly_attendance_summary')
      .upsert(upsertData, { onConflict: 'staff_id,month,year' })

    if (error) throw error

    return NextResponse.json({ success: true, imported: records.length })
  } catch (err) {
    console.error('Import API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
