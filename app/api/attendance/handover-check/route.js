import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/attendance/handover-check?staffId=UUID
 * Verifies if a relief/next-shift staff member is physically inside the cafe
 * before the current shift employee departs.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staffId')

    if (!staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 })
    }

    // 1. Fetch current staff details
    const { data: currentStaff, error: cErr } = await supabaseAdmin
      .from('staff')
      .select('id, name, department, designation, shift_start')
      .eq('id', staffId)
      .single()

    if (cErr || !currentStaff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // 2. Fetch all other active staff currently inside the geofence
    const { data: activeLocs, error: lErr } = await supabaseAdmin
      .from('staff_locations')
      .select(`
        staff_id,
        is_inside_geofence,
        last_updated,
        battery_level,
        staff:staff_id (
          id,
          name,
          department,
          designation,
          photo_url
        )
      `)
      .eq('is_inside_geofence', true)
      .neq('staff_id', staffId)

    if (lErr) throw lErr

    const staffInsideCafe = (activeLocs || []).map((l) => ({
      id: l.staff?.id,
      name: l.staff?.name,
      department: l.staff?.department,
      designation: l.staff?.designation,
      photo_url: l.staff?.photo_url,
      last_updated: l.last_updated
    }))

    // Handover is safe if at least one colleague in the same department/cafe is present
    const sameDeptRelief = staffInsideCafe.filter(
      (s) => s.department === currentStaff.department
    )

    const canHandover = staffInsideCafe.length > 0

    return NextResponse.json({
      success: true,
      canHandover,
      staffInsideCount: staffInsideCafe.length,
      sameDeptCount: sameDeptRelief.length,
      staffInsideCafe,
      message: canHandover
        ? `Relief staff present at cafe (${staffInsideCafe.map((s) => s.name).join(', ')})`
        : 'Warning: No other staff currently detected inside the cafe for handover.'
    })
  } catch (err) {
    console.error('[GET /api/attendance/handover-check]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
