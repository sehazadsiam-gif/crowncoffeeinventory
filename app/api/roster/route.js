import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'
import { formatTo24HourTime, normalizeShiftTime } from '../../../lib/roster-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('week_start')

    if (!weekStart) {
      return NextResponse.json({ error: 'week_start parameter is required' }, { status: 400 })
    }

    // Calculate 7-day date range for week
    const startDateObj = new Date(`${weekStart}T00:00:00Z`)
    const endDateObj = new Date(startDateObj.getTime() + 6 * 24 * 60 * 60 * 1000)
    const endDateStr = endDateObj.toISOString().split('T')[0]

    // 1. Fetch active rostered staff list
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, department, serial, is_active, photo_url, phone, mobile')
      .eq('is_active', true)
      .eq('is_rostered', true)
      .order('serial', { ascending: true })

    if (staffErr) throw staffErr

    // 2. Fetch existing roster logs for this week by date range or week_start
    const { data: rosterRaw, error: rosterErr } = await supabaseAdmin
      .from('duty_roster')
      .select('*')
      .or(`week_start.eq.${weekStart},and(day_date.gte.${weekStart},day_date.lte.${endDateStr})`)

    if (rosterErr) throw rosterErr

    // Normalize shift times to 12-Hour AM/PM format (e.g. '8:00 AM', '11:00 AM', '1:00 PM', 'OFF')
    const roster = (rosterRaw || []).map(r => ({
      ...r,
      shift_start_display: normalizeShiftTime(r.shift_start, r.is_off),
      shift_start_12h: normalizeShiftTime(r.shift_start, r.is_off)
    }))

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

    // Sanitize items with robust 12-hour -> 24-hour time formatting for Postgres
    const sanitizedItems = items.map(item => {
      const isExplicitOff = Boolean(item.is_off || item.shift_start === 'OFF')
      const { time: validTime, isOff: parsedIsOff } = formatTo24HourTime(item.shift_start)
      const finalIsOff = isExplicitOff || parsedIsOff

      return {
        staff_id: item.staff_id,
        week_start: item.week_start,
        day_date: item.day_date,
        shift_start: finalIsOff ? '11:00:00' : validTime,
        shift_hours: item.shift_hours || 10,
        is_off: finalIsOff
      }
    })

    // Upsert roster items into duty_roster
    const { data, error } = await supabaseAdmin
      .from('duty_roster')
      .upsert(sanitizedItems, { onConflict: 'staff_id,day_date' })
      .select()

    if (error) {
      console.error('[POST /api/roster] Upsert error:', error)
      throw error
    }

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
