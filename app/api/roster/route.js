import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('week_start')

    if (!weekStart) {
      return NextResponse.json({ error: 'week_start parameter is required' }, { status: 400 })
    }

    // 1. Fetch active staff list
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, department, serial, is_active')
      .eq('is_active', true)
      .order('serial', { ascending: true })

    if (staffErr) throw staffErr

    // 2. Fetch existing roster logs for this week
    const { data: roster, error: rosterErr } = await supabaseAdmin
      .from('duty_roster')
      .select('*')
      .eq('week_start', weekStart)

    if (rosterErr) throw rosterErr

    return NextResponse.json({
      success: true,
      week_start: weekStart,
      staff: staff || [],
      roster: roster || []
    })
  } catch (err) {
    console.error('[GET /api/roster]', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch roster' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { items } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 })
    }

    // Upsert roster items into duty_roster (isolated from attendance/payroll)
    const { data, error } = await supabaseAdmin
      .from('duty_roster')
      .upsert(items, { onConflict: 'staff_id,day_date' })
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Saved ${items.length} roster entries successfully`,
      count: items.length
    })
  } catch (err) {
    console.error('[POST /api/roster]', err)
    return NextResponse.json({ error: err.message || 'Failed to save roster' }, { status: 500 })
  }
}
