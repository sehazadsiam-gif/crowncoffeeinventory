import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/staff/location/batch
 * Bulk inserts cached offline location logs when connection is restored.
 * Body: { pings: [ { staffId, latitude, longitude, speed, batteryLevel, recordedAt } ] }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { pings } = body

    if (!Array.isArray(pings) || pings.length === 0) {
      return NextResponse.json({ error: 'pings array is required and must not be empty' }, { status: 400 })
    }

    // Limit batch size to 200 per call for performance
    const batch = pings.slice(0, 200).map((p) => ({
      staff_id: p.staffId,
      latitude: parseFloat(p.latitude),
      longitude: parseFloat(p.longitude),
      speed: p.speed !== undefined && p.speed !== null ? parseFloat(p.speed) : null,
      battery_level: p.batteryLevel !== undefined && p.batteryLevel !== null ? parseInt(p.batteryLevel) : null,
      recorded_at: p.recordedAt || new Date().toISOString()
    }))

    const { data, error } = await supabaseAdmin
      .from('staff_location_logs')
      .insert(batch)

    if (error) throw error

    // Also update the latest location for the staff member using the newest ping
    const latestPing = batch[batch.length - 1]
    if (latestPing) {
      await supabaseAdmin
        .from('staff_locations')
        .upsert(
          {
            staff_id: latestPing.staff_id,
            latitude: latestPing.latitude,
            longitude: latestPing.longitude,
            speed: latestPing.speed,
            battery_level: latestPing.battery_level,
            last_updated: latestPing.recorded_at
          },
          { onConflict: 'staff_id' }
        )
    }

    return NextResponse.json({
      success: true,
      insertedCount: batch.length
    })
  } catch (err) {
    console.error('[POST /api/staff/location/batch]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
