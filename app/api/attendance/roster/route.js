import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('week_start')

    if (!weekStart) {
      return NextResponse.json({ error: 'week_start param is required' }, { status: 400 })
    }

    // Fetch roster entries for week
    const { data: roster, error: rErr } = await supabaseAdmin
      .from('duty_roster')
      .select('*')
      .eq('week_start', weekStart)

    if (rErr) throw rErr

    // Fetch active staff
    const { data: staff, error: sErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, shift_start, weekly_off')
      .eq('is_active', true)
      .order('serial', { ascending: true })

    if (sErr) throw sErr

    // Fetch AI draft for this week if any
    const { data: draft } = await supabaseAdmin
      .from('ai_roster_drafts')
      .select('*')
      .eq('week_start', weekStart)
      .single()

    return NextResponse.json({ roster: roster || [], staff: staff || [], draft: draft || null })
  } catch (err) {
    console.error('[GET /api/attendance/roster]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { items } = await request.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('duty_roster')
      .upsert(items, { onConflict: 'staff_id,day_date' })
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, count: data?.length || 0 })
  } catch (err) {
    console.error('[POST /api/attendance/roster]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
