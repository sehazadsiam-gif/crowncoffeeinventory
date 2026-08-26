import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { formatTo24HourTime, normalizeShiftTime } from '../../../../lib/roster-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('week_start')

    if (!weekStart) {
      return NextResponse.json({ error: 'week_start param is required' }, { status: 400 })
    }

    const startDateObj = new Date(`${weekStart}T00:00:00Z`)
    const endDateObj = new Date(startDateObj.getTime() + 6 * 24 * 60 * 60 * 1000)
    const endDateStr = endDateObj.toISOString().split('T')[0]

    // Fetch roster entries for week
    const { data: rosterRaw, error: rErr } = await supabaseAdmin
      .from('duty_roster')
      .select('*')
      .or(`week_start.eq.${weekStart},and(day_date.gte.${weekStart},day_date.lte.${endDateStr})`)

    if (rErr) throw rErr

    const roster = (rosterRaw || []).map(r => ({
      ...r,
      shift_start_display: normalizeShiftTime(r.shift_start, r.is_off),
      shift_start_12h: normalizeShiftTime(r.shift_start, r.is_off)
    }))

    // Fetch active staff
    let staff = []
    let { data: sData, error: sErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, shift_start, weekly_off, is_rostered, department, rfid_code')
      .eq('is_active', true)
      .order('serial', { ascending: true })

    if (sErr) {
      const fallback = await supabaseAdmin
        .from('staff')
        .select('id, name, employee_id, designation, shift_start, weekly_off')
        .eq('is_active', true)
        .order('serial', { ascending: true })
      if (fallback.error) throw fallback.error
      staff = (fallback.data || []).map(s => ({ ...s, is_rostered: true }))
    } else {
      staff = sData || []
    }

    // Fetch AI draft for this week if any
    const { data: draft } = await supabaseAdmin
      .from('ai_roster_drafts')
      .select('*')
      .eq('week_start', weekStart)
      .maybeSingle()

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

    const { data, error } = await supabaseAdmin
      .from('duty_roster')
      .upsert(sanitizedItems, { onConflict: 'staff_id,day_date' })
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, count: data?.length || 0 })
  } catch (err) {
    console.error('[POST /api/attendance/roster]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
