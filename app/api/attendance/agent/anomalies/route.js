import { NextResponse } from 'next/server'
import { detectAnomalies } from '../../../../../lib/attendance-agent'
import { supabaseAdmin } from '../../../../../lib/supabase'

export async function GET() {
  try {
    const { data: anomalies, error } = await supabaseAdmin
      .from('attendance_anomalies')
      .select('*, staff:staff_id(name, employee_id, designation)')
      .eq('dismissed', false)
      .order('flagged_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ anomalies: anomalies || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const result = await detectAnomalies()
    return NextResponse.json({ success: true, result })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('attendance_anomalies')
      .update({ dismissed: true, dismissed_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
