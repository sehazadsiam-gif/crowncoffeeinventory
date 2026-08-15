import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Robustly parses and formats shift time inputs (e.g., '13:00', '1:00 PM', '8:00 AM', 'OFF')
 * into 24-hour Postgres TIME format 'HH:MM:SS'.
 */
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
      return NextResponse.json({ error: 'week_start parameter is required' }, { status: 400 })
    }

    // Calculate 7-day date range for week
    const startDateObj = new Date(`${weekStart}T00:00:00Z`)
    const endDateObj = new Date(startDateObj.getTime() + 6 * 24 * 60 * 60 * 1000)
    const endDateStr = endDateObj.toISOString().split('T')[0]

    // 1. Fetch active rostered staff list
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, department, serial, is_active')
      .eq('is_active', true)
      .eq('is_rostered', true)
      .order('serial', { ascending: true })

    if (staffErr) throw staffErr

    // 2. Fetch existing roster logs for this week by date range or week_start
    const { data: roster, error: rosterErr } = await supabaseAdmin
      .from('duty_roster')
      .select('*')
      .or(`week_start.eq.${weekStart},and(day_date.gte.${weekStart},day_date.lte.${endDateStr})`)

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

    // Sanitize items with robust 24-hour time formatting
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

    // Upsert roster items into duty_roster (isolated from attendance/payroll)
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
