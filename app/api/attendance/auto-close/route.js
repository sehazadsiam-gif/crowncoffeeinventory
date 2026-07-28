import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function GET(request) {
  return handleAutoClose(request)
}

export async function POST(request) {
  return handleAutoClose(request)
}

async function handleAutoClose(request) {
  try {
    // ── 5:00 AM Business Day Reset Rule for Auto-Close ──
    const now = new Date()
    const localHour = parseInt(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour12: false }).split(':')[0], 10) % 24
    
    // If running before 5:00 AM, the active business day is still yesterday, so cutoff is strictly before yesterday
    let businessTodayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
    if (localHour < 5) {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      businessTodayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
    }

    // Only close records strictly before current business day
    const { data: openLogs, error } = await supabaseAdmin
      .from('attendance_log')
      .select('id, staff_id, check_in_at, date')
      .is('check_out_at', null)
      .not('check_in_at', 'is', null)
      .lt('date', businessTodayStr)

    if (error) throw error

    if (!openLogs || openLogs.length === 0) {
      return NextResponse.json({ success: true, message: 'No unclosed attendance logs found from previous days.' })
    }

    let closedCount = 0
    for (const log of openLogs) {
      const checkIn = new Date(log.check_in_at)
      // Auto-set check_out to check_in + 10 hours (standard shift)
      const autoCheckOut = new Date(checkIn.getTime() + 10 * 60 * 60 * 1000)

      const { error: updateErr } = await supabaseAdmin
        .from('attendance_log')
        .update({
          check_out_at: autoCheckOut.toISOString(),
          hours_worked: 10,
          overtime_minutes: 0,
          auto_flagged: true,
          notes: '⚠️ Auto-closed — no check-out recorded',
          updated_at: new Date().toISOString()
        })
        .eq('id', log.id)

      if (!updateErr) closedCount++
    }

    return NextResponse.json({
      success: true,
      message: `Auto-closed ${closedCount} open attendance log(s) from previous days.`,
      count: closedCount
    })
  } catch (err) {
    console.error('[auto-close API]', err)
    return NextResponse.json({ error: err.message || 'Auto-close failed' }, { status: 500 })
  }
}
