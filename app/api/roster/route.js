import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'
import { formatTo24HourTime, normalizeShiftTime } from '../../../lib/roster-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('week_start')
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')

    // 1. Fetch active rostered staff list
    const { data: staffRaw, error: staffErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, department, serial, is_active, photo_url, emergency_phone')
      .eq('is_active', true)
      .eq('is_rostered', true)
      .order('serial', { ascending: true })

    if (staffErr) throw staffErr

    const staff = (staffRaw || []).map(s => ({
      ...s,
      photo_url: s.photo_url ? (s.photo_url.startsWith('http') ? s.photo_url : `/api/staff/${s.id}/photo`) : null,
      phone: s.emergency_phone || ''
    }))

    // 2. Fetch existing roster logs from duty_roster with supabaseAdmin
    let rosterRaw = []
    if (startDateParam && endDateParam) {
      const { data, error } = await supabaseAdmin
        .from('duty_roster')
        .select('*')
        .gte('day_date', startDateParam)
        .lte('day_date', endDateParam)
        .order('day_date', { ascending: true })
      if (error) throw error
      rosterRaw = data || []
    } else if (weekStart) {
      const wsList = weekStart.split(',').map(s => s.trim()).filter(Boolean)
      if (wsList.length === 1) {
        const startDateObj = new Date(`${wsList[0]}T00:00:00Z`)
        const endDateObj = new Date(startDateObj.getTime() + 6 * 24 * 60 * 60 * 1000)
        const endDateStr = endDateObj.toISOString().split('T')[0]
        const { data, error } = await supabaseAdmin
          .from('duty_roster')
          .select('*')
          .or(`week_start.eq.${wsList[0]},and(day_date.gte.${wsList[0]},day_date.lte.${endDateStr})`)
          .order('day_date', { ascending: true })
        if (error) throw error
        rosterRaw = data || []
      } else {
        const { data, error } = await supabaseAdmin
          .from('duty_roster')
          .select('*')
          .in('week_start', wsList)
          .order('day_date', { ascending: true })
        if (error) throw error
        rosterRaw = data || []
      }
    } else {
      // Default: recent roster
      const { data, error } = await supabaseAdmin
        .from('duty_roster')
        .select('*')
        .order('day_date', { ascending: true })
        .limit(1000)
      if (error) throw error
      rosterRaw = data || []
    }

    // Normalize shift times strictly to 12-Hour AM/PM format ('11:00 AM', '1:00 PM', 'OFF')
    const roster = (rosterRaw || []).map(r => {
      const norm = normalizeShiftTime(r.shift_start, r.is_off)
      return {
        ...r,
        shift_start: norm,
        shift_start_display: norm,
        shift_start_12h: norm,
        is_off: Boolean(r.is_off || norm === 'OFF'),
        is_leave: Boolean(r.is_leave),
        is_duty_change: Boolean(r.is_duty_change)
      }
    })

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
