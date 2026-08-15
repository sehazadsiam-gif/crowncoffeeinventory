import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staff_id')
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('staff_shift_swaps')
      .select(`
        *,
        requester:staff!requester_id(id, name, employee_id, designation),
        target_staff:staff!target_staff_id(id, name, employee_id, designation)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (staffId) {
      query = query.or(`requester_id.eq.${staffId},target_staff_id.eq.${staffId}`)
    }

    const { data, error } = await query

    if (error) {
      console.warn('[GET /api/staff/shift-swaps] Table missing or DB error:', error.message)
      return NextResponse.json({ swaps: [] }, { status: 200 })
    }

    return NextResponse.json({ swaps: data || [] })
  } catch (err) {
    console.error('[GET /api/staff/shift-swaps]', err)
    return NextResponse.json({ swaps: [] }, { status: 200 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { requester_id, requester_date, target_staff_id, target_date, reason = '' } = body

    if (!requester_id || !requester_date || !target_staff_id) {
      return NextResponse.json({ error: 'requester_id, requester_date, and target_staff_id are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('staff_shift_swaps')
      .insert({
        requester_id,
        requester_date,
        target_staff_id,
        target_date: target_date || null,
        reason: reason || '',
        status: 'pending_peer'
      })
      .select('*')

    if (error) {
      console.error('[POST /api/staff/shift-swaps]', error)
      return NextResponse.json({ error: error.message || 'Failed to create swap request' }, { status: 500 })
    }

    return NextResponse.json({ success: true, swap: data?.[0] })
  } catch (err) {
    console.error('[POST /api/staff/shift-swaps]', err)
    return NextResponse.json({ error: err.message || 'Failed to create shift swap' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const { swap_id, action, admin_notes = '' } = body

    if (!swap_id || !action) {
      return NextResponse.json({ error: 'swap_id and action are required' }, { status: 400 })
    }

    // Fetch existing swap request
    const { data: swap, error: fetchErr } = await supabaseAdmin
      .from('staff_shift_swaps')
      .select('*')
      .eq('id', swap_id)
      .single()

    if (fetchErr || !swap) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 })
    }

    let newStatus = swap.status
    let updateFields = { updated_at: new Date().toISOString() }

    if (action === 'peer_accept') {
      newStatus = 'pending_admin'
      updateFields.status = 'pending_admin'
      updateFields.peer_response_at = new Date().toISOString()
    } else if (action === 'peer_decline') {
      newStatus = 'rejected'
      updateFields.status = 'rejected'
      updateFields.peer_response_at = new Date().toISOString()
    } else if (action === 'admin_approve') {
      newStatus = 'approved'
      updateFields.status = 'approved'
      updateFields.admin_response_at = new Date().toISOString()
      updateFields.admin_notes = admin_notes || ''

      // ── Auto-update duty_roster for both staff members ──
      try {
        const { data: reqRoster } = await supabaseAdmin
          .from('duty_roster')
          .select('*')
          .eq('staff_id', swap.requester_id)
          .eq('day_date', swap.requester_date)
          .maybeSingle()

        const { data: tarRoster } = await supabaseAdmin
          .from('duty_roster')
          .select('*')
          .eq('staff_id', swap.target_staff_id)
          .eq('day_date', swap.target_date || swap.requester_date)
          .maybeSingle()

        const reqShift = reqRoster?.shift_start || '08:00'
        const tarShift = tarRoster?.shift_start || '13:00'

        // Swap shifts in duty_roster
        if (swap.target_date) {
          await supabaseAdmin.from('duty_roster').upsert({
            staff_id: swap.requester_id,
            day_date: swap.target_date,
            shift_start: tarShift,
            is_off: false
          }, { onConflict: 'staff_id,day_date' })

          await supabaseAdmin.from('duty_roster').upsert({
            staff_id: swap.target_staff_id,
            day_date: swap.requester_date,
            shift_start: reqShift,
            is_off: false
          }, { onConflict: 'staff_id,day_date' })
        } else {
          await supabaseAdmin.from('duty_roster').upsert({
            staff_id: swap.target_staff_id,
            day_date: swap.requester_date,
            shift_start: reqShift,
            is_off: false
          }, { onConflict: 'staff_id,day_date' })
        }
      } catch (err) {
        console.error('[PUT /api/staff/shift-swaps] Roster swap error:', err)
      }
    } else if (action === 'admin_reject') {
      newStatus = 'rejected'
      updateFields.status = 'rejected'
      updateFields.admin_response_at = new Date().toISOString()
      updateFields.admin_notes = admin_notes || ''
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('staff_shift_swaps')
      .update(updateFields)
      .eq('id', swap_id)
      .select('*')

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true, swap: updated?.[0] })
  } catch (err) {
    console.error('[PUT /api/staff/shift-swaps]', err)
    return NextResponse.json({ error: err.message || 'Failed to update shift swap' }, { status: 500 })
  }
}
