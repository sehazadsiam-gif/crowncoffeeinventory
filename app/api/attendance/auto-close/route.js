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
    const todayStr = new Date().toISOString().split('T')[0]

    // Find all attendance records where check_in_at is present but check_out_at is null
    const { data: openLogs, error } = await supabaseAdmin
      .from('attendance_log')
      .select('id, staff_id, check_in_at, date')
      .is('check_out_at', null)
      .not('check_in_at', 'is', null)

    if (error) throw error

    if (!openLogs || openLogs.length === 0) {
      return NextResponse.json({ success: true, message: 'No unclosed attendance logs found.' })
    }

    let closedCount = 0
    for (const log of openLogs) {
      const checkIn = new Date(log.check_in_at)
      // Auto-set check_out to check_in + 10 hours (600 mins)
      const autoCheckOut = new Date(checkIn.getTime() + 10 * 60 * 60 * 1000)

      const { error: updateErr } = await supabaseAdmin
        .from('attendance_log')
        .update({
          check_out_at: autoCheckOut.toISOString(),
          hours_worked: 10,
          overtime_minutes: 0,
          auto_flagged: true,
          notes: 'auto_closed — no check-out recorded',
          updated_at: new Date().toISOString()
        })
        .eq('id', log.id)

      if (!updateErr) closedCount++
    }

    return NextResponse.json({
      success: true,
      message: `Auto-closed ${closedCount} open attendance log(s).`,
      count: closedCount
    })
  } catch (err) {
    console.error('[auto-close API]', err)
    return NextResponse.json({ error: err.message || 'Auto-close failed' }, { status: 500 })
  }
}
