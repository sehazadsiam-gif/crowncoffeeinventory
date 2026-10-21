import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/staff/location-history?staffId=...&date=YYYY-MM-DD
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 })
    }

    const startOfDay = `${dateStr}T00:00:00.000Z`
    const endOfDay = `${dateStr}T23:59:59.999Z`

    const { data: logs, error } = await supabaseAdmin
      .from('staff_location_logs')
      .select('id, latitude, longitude, speed, battery_level, recorded_at')
      .eq('staff_id', staffId)
      .gte('recorded_at', startOfDay)
      .lte('recorded_at', endOfDay)
      .order('recorded_at', { ascending: true })
      .limit(1000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      staffId,
      date: dateStr,
      points: logs || []
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
