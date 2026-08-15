import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatTo24HourTime(str) {
  if (!str || str === 'OFF') return { time: '08:00:00', isOff: true }
  let s = String(str).trim().toUpperCase()
  if (s === 'OFF') return { time: '08:00:00', isOff: true }

  const isPM = s.includes('PM')
  const isAM = s.includes('AM')
  s = s.replace(/(AM|PM)/g, '').trim()

  let [hStr, mStr] = s.split(':')
  let h = parseInt(hStr, 10)
  let m = parseInt(mStr || '0', 10)

  if (isNaN(h)) return { time: '08:00:00', isOff: false }
  if (isNaN(m)) m = 0

  if (isPM && h < 12) h += 12
  if (isAM && h === 12) h = 0

  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return { time: `${hh}:${mm}:00`, isOff: false }
}

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
    const { data: roster, error: rErr } = await supabaseAdmin
      .from('duty_roster')
      .select('*')
      .or(`week_start.eq.${weekStart},and(day_date.gte.${weekStart},day_date.lte.${endDateStr})`)

    if (rErr) throw rErr

    // Fetch active staff (fallback if is_rostered column not yet created)
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
        shift_start: finalIsOff ? '08:00:00' : validTime,
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
