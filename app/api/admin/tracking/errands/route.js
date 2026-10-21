import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/tracking/errands?status=in_progress|completed|all
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'in_progress'

    let query = supabaseAdmin
      .from('errand_trips')
      .select(`
        id,
        staff_id,
        destination,
        purpose,
        estimated_cost,
        actual_cost,
        departure_time,
        return_time,
        distance_km,
        status,
        notes,
        created_at,
        staff:staff_id (
          id,
          name,
          employee_id,
          phone,
          designation,
          photo_url
        )
      `)
      .order('departure_time', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: errands, error } = await query
    if (error) throw error

    return NextResponse.json({
      success: true,
      errands: errands || []
    })
  } catch (err) {
    console.error('[GET /api/admin/tracking/errands]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/admin/tracking/errands
 * Dispatches an errand trip (e.g., Bazar run).
 * Body: { staffId, destination, purpose?, estimatedCost?, notes? }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { staffId, destination, purpose, estimatedCost, notes } = body

    if (!staffId || !destination) {
      return NextResponse.json({ error: 'staffId and destination are required' }, { status: 400 })
    }

    const { data: errand, error } = await supabaseAdmin
      .from('errand_trips')
      .insert({
        staff_id: staffId,
        destination,
        purpose: purpose || 'Supplies / Bazar purchase',
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : 0,
        departure_time: new Date().toISOString(),
        status: 'in_progress',
        notes
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, errand })
  } catch (err) {
    console.error('[POST /api/admin/tracking/errands]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/tracking/errands
 * Marks an errand trip as completed or updates cost/distance.
 * Body: { errandId, status: 'completed' | 'cancelled', actualCost?, distanceKm?, notes? }
 */
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { errandId, status = 'completed', actualCost, distanceKm, notes } = body

    if (!errandId) {
      return NextResponse.json({ error: 'errandId is required' }, { status: 400 })
    }

    const updates = {
      status,
      return_time: status === 'completed' ? new Date().toISOString() : undefined,
      actual_cost: actualCost !== undefined ? parseFloat(actualCost) : undefined,
      distance_km: distanceKm !== undefined ? parseFloat(distanceKm) : undefined,
      notes: notes !== undefined ? notes : undefined
    }

    // Clean undefined fields
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k])

    const { data, error } = await supabaseAdmin
      .from('errand_trips')
      .update(updates)
      .eq('id', errandId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, errand: data })
  } catch (err) {
    console.error('[PATCH /api/admin/tracking/errands]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
