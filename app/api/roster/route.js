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
      .eq('is_rostered', true)
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

    // Sanitize items: shift_start column is data type TIME in Postgres.
    // If shift_start is 'OFF' or invalid, set is_off = true and use '08:00' valid TIME.
    const sanitizedItems = items.map(item => {
      const isOff = Boolean(item.is_off || item.shift_start === 'OFF')
      let validTime = item.shift_start
      if (!validTime || validTime === 'OFF' || !/^\d{2}:\d{2}/.test(validTime)) {
        validTime = '08:00'
      }
      return {
        staff_id: item.staff_id,
        week_start: item.week_start,
        day_date: item.day_date,
        shift_start: validTime,
        shift_hours: item.shift_hours || 10,
        is_off: isOff
      }
    })

    // Upsert roster items into duty_roster (isolated from attendance/payroll)
    const { data, error } = await supabaseAdmin
      .from('duty_roster')
      .upsert(sanitizedItems, { onConflict: 'staff_id,day_date' })
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
