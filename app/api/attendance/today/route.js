import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    // ── Bangladesh Standard Time (Asia/Dhaka, UTC+6) ──────────────────────────
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })

    // Fetch all active staff
    let staff = []
    let { data: sData, error: staffErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, employee_id, designation, shift_start, department, photo_url, rfid_code, is_rostered')
      .eq('is_active', true)
      .order('serial', { ascending: true })

    if (staffErr) {
      const fallback = await supabaseAdmin
        .from('staff')
        .select('id, name, employee_id, designation, shift_start, department, photo_url, rfid_code')
        .eq('is_active', true)
        .order('serial', { ascending: true })
      if (fallback.error) throw fallback.error
      staff = (fallback.data || []).map(s => ({ ...s, is_rostered: true }))
    } else {
      staff = sData || []
    }

    // Fetch today's attendance logs
    const { data: logs, error: logsErr } = await supabaseAdmin
      .from('attendance_log')
      .select('*')
      .eq('date', today)

    if (logsErr) throw logsErr

    // ── Fetch current month logs for monthly warnings (late > 3, absent > 4) ──
    const startOfMonth = `${today.slice(0, 7)}-01`
    const monthName = new Date().toLocaleDateString('en-US', { month: 'long', timeZone: 'Asia/Dhaka' })
    const { data: monthLogs } = await supabaseAdmin
      .from('attendance_log')
      .select('staff_id, status')
      .gte('date', startOfMonth)
      .lte('date', today)

    const monthlyLateMap = new Map()
    const monthlyAbsentMap = new Map()

    ;(monthLogs || []).forEach(ml => {
      if (ml.status === 'late') {
        monthlyLateMap.set(ml.staff_id, (monthlyLateMap.get(ml.staff_id) || 0) + 1)
      } else if (ml.status === 'absent') {
        monthlyAbsentMap.set(ml.staff_id, (monthlyAbsentMap.get(ml.staff_id) || 0) + 1)
      }
    })

    const logMap = new Map((logs || []).map(l => [l.staff_id, l]))

    // ── Business Rule: No roster, no day off. If no check-in → absent. ────────
    const records = (staff || []).map(s => {
      const log = logMap.get(s.id)

      // Status: use logged status, or absent if no log exists
      const status = log ? log.status : 'absent'

      return {
        staff_id: s.id,
        name: s.name,
        employee_id: s.employee_id || 'N/A',
        designation: s.designation,
        department: s.department || 'front',
        photo_url: s.photo_url ? `/api/staff/${s.id}/photo` : null,
        rfid_code: s.rfid_code || null,
        shift_start: s.shift_start || '08:00',
        is_rostered: s.is_rostered !== false,
        check_in_at: log?.check_in_at || null,
        check_out_at: log?.check_out_at || null,
        break_start_at: log?.break_start_at || null,
        break_end_at: log?.break_end_at || null,
        break_duration_minutes: log?.break_duration_minutes || 0,
        status,
        minutes_late: log?.minutes_late || 0,
        overtime_minutes: log?.overtime_minutes || 0,
        source: log?.source || null,
        hours_worked: log?.hours_worked || null,
        monthly_late_count: monthlyLateMap.get(s.id) || (status === 'late' ? 1 : 0),
        monthly_absent_count: monthlyAbsentMap.get(s.id) || (status === 'absent' ? 1 : 0),
        month_name: monthName
      }
    })

    const summary = {
      total: records.length,
      present: records.filter(r => r.status === 'present').length,
      late: records.filter(r => r.status === 'late').length,
      absent: records.filter(r => r.status === 'absent').length,
      on_leave: records.filter(r => r.status === 'on_leave').length,
      off: records.filter(r => r.status === 'off').length,
      month_name: monthName
    }

    return NextResponse.json(
      { date: today, month_name: monthName, summary, records },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    )
  } catch (err) {
    console.error('[GET /api/attendance/today]', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch today attendance' }, { status: 500 })
  }
}
