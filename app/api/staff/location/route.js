import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { getDistanceMeters, isInsideGeofence } from '../../../../lib/geofence-utils'

export const dynamic = 'force-dynamic'

/**
 * POST /api/staff/location
 * Body: { staffId, latitude, longitude, accuracy, speed, heading, altitude, batteryLevel, isCharging, trackingMode, addressHint }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      staffId,
      latitude,
      longitude,
      accuracy = null,
      speed = null,
      heading = null,
      altitude = null,
      batteryLevel = null,
      isCharging = false,
      trackingMode = 'foreground',
      addressHint = null
    } = body

    if (!staffId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'staffId, latitude, and longitude are required' },
        { status: 400 }
      )
    }

    const latNum = parseFloat(latitude)
    const lonNum = parseFloat(longitude)

    if (isNaN(latNum) || isNaN(lonNum)) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    // 1. Fetch active geofence zones
    const { data: zones } = await supabaseAdmin
      .from('geofence_zones')
      .select('*')
      .eq('is_active', true)

    let isInsideAnyWorkplace = false
    let currentZone = null

    if (zones && zones.length > 0) {
      for (const zone of zones) {
        if (isInsideGeofence(latNum, lonNum, zone)) {
          isInsideAnyWorkplace = true
          currentZone = zone
          break
        }
      }
    }

    // 2. Fetch previous state to detect geofence enter/exit
    const { data: prevLocation } = await supabaseAdmin
      .from('staff_locations')
      .select('is_inside_geofence')
      .eq('staff_id', staffId)
      .maybeSingle()

    const wasInside = prevLocation?.is_inside_geofence || false

    if (!wasInside && isInsideAnyWorkplace && currentZone) {
      // ENTERED geofence
      await supabaseAdmin.from('geofence_events').insert({
        staff_id: staffId,
        zone_id: currentZone.id,
        event_type: 'enter'
      })
    } else if (wasInside && !isInsideAnyWorkplace) {
      // EXITED geofence
      const defaultZoneId = zones?.[0]?.id || null
      if (defaultZoneId) {
        await supabaseAdmin.from('geofence_events').insert({
          staff_id: staffId,
          zone_id: defaultZoneId,
          event_type: 'exit'
        })
      }
    }

    // 3. Upsert live staff location
    const { error: upsertErr } = await supabaseAdmin
      .from('staff_locations')
      .upsert({
        staff_id: staffId,
        latitude: latNum,
        longitude: lonNum,
        accuracy: accuracy !== null ? parseFloat(accuracy) : null,
        speed: speed !== null ? parseFloat(speed) : null,
        heading: heading !== null ? parseFloat(heading) : null,
        altitude: altitude !== null ? parseFloat(altitude) : null,
        battery_level: batteryLevel !== null ? parseInt(batteryLevel, 10) : null,
        is_charging: !!isCharging,
        tracking_mode: trackingMode,
        address_hint: addressHint,
        is_inside_geofence: isInsideAnyWorkplace,
        last_updated: new Date().toISOString()
      }, { onConflict: 'staff_id' })

    if (upsertErr) {
      console.error('[POST /api/staff/location] Upsert error:', upsertErr)
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    // 4. Log breadcrumb entry (asynchronously or fire-and-forget safe)
    supabaseAdmin
      .from('staff_location_logs')
      .insert({
        staff_id: staffId,
        latitude: latNum,
        longitude: lonNum,
        speed: speed !== null ? parseFloat(speed) : null,
        battery_level: batteryLevel !== null ? parseInt(batteryLevel, 10) : null,
        recorded_at: new Date().toISOString()
      })
      .then(() => {})
      .catch((e) => console.error('[POST /api/staff/location] Log insert failed:', e))

    return NextResponse.json({
      success: true,
      isInsideGeofence: isInsideAnyWorkplace,
      zoneName: currentZone?.name || null
    })
  } catch (err) {
    console.error('[POST /api/staff/location]', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

/**
 * GET /api/staff/location
/**
 * GET /api/staff/location
 * Returns all latest staff locations joined with staff profile info and active geofence zones
 */
export async function GET() {
  try {
    // 1. ALWAYS fetch all active staff from the staff directory first
    let allStaff = []
    try {
      const { data: staffData, error: staffErr } = await supabaseAdmin
        .from('staff')
        .select('id, name, employee_id, designation, department, photo_url, emergency_phone, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (staffErr) {
        console.error('[GET /api/staff/location] Error fetching staff:', staffErr)
      } else {
        allStaff = staffData || []
      }
    } catch (sErr) {
      console.error('[GET /api/staff/location] Staff query exception:', sErr)
    }

    // 2. Fetch geofence zones
    let zones = []
    try {
      const { data: zoneData } = await supabaseAdmin
        .from('geofence_zones')
        .select('*')
        .order('created_at', { ascending: true })
      zones = zoneData || []
    } catch (zErr) {
      console.error('[GET /api/staff/location] Zones query exception:', zErr)
    }

    // Default Crown Coffee geofence zone if none configured in DB
    if (!zones || zones.length === 0) {
      zones = [
        {
          id: 'crown-main',
          name: 'Crown Coffee Main',
          latitude: 23.8759,
          longitude: 90.3795,
          radius_m: 120,
          is_active: true
        }
      ]
    }

    // 3. Fetch latest locations with graceful fallback
    let locations = []
    try {
      const { data: locData, error: locErr } = await supabaseAdmin
        .from('staff_locations')
        .select(`
          staff_id,
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
          altitude,
          battery_level,
          is_charging,
          tracking_mode,
          address_hint,
          is_inside_geofence,
          last_updated,
          staff:staff_id (
            id,
            name,
            employee_id,
            designation,
            department,
            photo_url,
            emergency_phone,
            is_active
          )
        `)
        .order('last_updated', { ascending: false })

      if (locErr) {
        console.warn('[GET /api/staff/location] Location fetch notice (schema cache or empty):', locErr.message)
      } else {
        locations = locData || []
      }
    } catch (lErr) {
      console.warn('[GET /api/staff/location] Location query exception:', lErr.message)
    }

    return NextResponse.json({
      success: true,
      locations: locations || [],
      staffList: allStaff || [],
      zones: zones || []
    })
  } catch (err) {
    console.error('[GET /api/staff/location]', err)
    return NextResponse.json({
      success: false,
      error: err.message || 'Server error',
      locations: [],
      staffList: [],
      zones: []
    }, { status: 500 })
  }
}
