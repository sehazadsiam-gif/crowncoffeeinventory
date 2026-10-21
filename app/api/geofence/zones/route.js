import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/geofence/zones
 * POST /api/geofence/zones (create or update zone)
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('geofence_zones')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, zones: data || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { id, name, latitude, longitude, radius_m = 100, zone_type = 'workplace', is_active = true } = body

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'name, latitude, and longitude are required' },
        { status: 400 }
      )
    }

    const payload = {
      name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius_m: parseInt(radius_m, 10),
      zone_type,
      is_active: !!is_active
    }

    let result
    if (id) {
      const { data, error } = await supabaseAdmin
        .from('geofence_zones')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabaseAdmin
        .from('geofence_zones')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      result = data
    }

    return NextResponse.json({ success: true, zone: result })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
