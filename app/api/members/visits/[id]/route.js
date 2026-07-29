/**
 * PATCH /api/members/visits/[id]  — Edit a visit's timestamp
 * DELETE /api/members/visits/[id] — Delete a visit and roll back member counters
 *
 * Both require admin token.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase'
import { validateSession } from '../../../../../lib/auth'

export const dynamic = 'force-dynamic'

// ── Auth helper ────────────────────────────────────────────────────────────────
async function requireAdmin(request) {
  const cookie = request.headers.get('cookie') || ''
  const tokenMatch = cookie.match(/(?:^|;\s*)cc_token=([^;]+)/)
  const bearerMatch = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)/)
  const token = tokenMatch?.[1] || bearerMatch?.[1]
  if (!token) return null
  const session = await validateSession(token)
  if (!session || (session.role !== 'admin' && session.role !== 'sub_admin')) return null
  return session
}

// ── PATCH: Edit visited_at timestamp ──────────────────────────────────────────
export async function PATCH(request, { params }) {
  try {
    const session = await requireAdmin(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { visited_at } = body

    if (!visited_at) {
      return NextResponse.json({ error: 'visited_at is required' }, { status: 400 })
    }

    // Validate the timestamp is parseable
    const newDate = new Date(visited_at)
    if (isNaN(newDate.getTime())) {
      return NextResponse.json({ error: 'Invalid visited_at timestamp' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('member_visits')
      .update({ visited_at: newDate.toISOString() })
      .eq('id', id)
      .select('*, members(id, full_name)')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Visit not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, visit: data })
  } catch (err) {
    console.error('[PATCH /api/members/visits/[id]]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── DELETE: Remove visit and roll back member stats ───────────────────────────
export async function DELETE(request, { params }) {
  try {
    const session = await requireAdmin(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // 1. Fetch the visit so we know which member to update
    const { data: visit, error: fetchErr } = await supabaseAdmin
      .from('member_visits')
      .select('*, members(id, total_visits, visit_punch_count, free_coffee_rewards_available)')
      .eq('id', id)
      .single()

    if (fetchErr || !visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const member = visit.members
    if (!member) {
      return NextResponse.json({ error: 'Member not found for this visit' }, { status: 404 })
    }

    // 2. Delete the visit row
    const { error: deleteErr } = await supabaseAdmin
      .from('member_visits')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 })
    }

    // 3. Also delete the matching rfid_tap row if one exists (same member, same minute)
    // Best-effort — non-blocking
    supabaseAdmin
      .from('member_rfid_taps')
      .delete()
      .eq('member_id', member.id)
      .eq('visit_number', member.total_visits)
      .then(() => {})
      .catch(() => {})

    // 4. Roll back member counters
    //    total_visits  -1
    //    visit_punch_count: if currently 0, roll back to 4 (was about to earn reward)
    //    otherwise -1
    const newTotalVisits = Math.max(0, (member.total_visits || 0) - 1)
    let newPunchCount = (member.visit_punch_count || 0) - 1
    let newFreeCoffees = member.free_coffee_rewards_available || 0

    if (newPunchCount < 0) {
      // The deleted visit was the 5th punch (reward was just earned)
      newPunchCount = 4
      newFreeCoffees = Math.max(0, newFreeCoffees - 1)
    }

    const { error: updateErr } = await supabaseAdmin
      .from('members')
      .update({
        total_visits: newTotalVisits,
        visit_punch_count: newPunchCount,
        free_coffee_rewards_available: newFreeCoffees
      })
      .eq('id', member.id)

    if (updateErr) {
      console.error('[DELETE visit] member rollback failed:', updateErr)
      // Visit was already deleted — report partial success
      return NextResponse.json({
        success: true,
        warning: 'Visit deleted but member counter rollback failed',
        member_id: member.id
      })
    }

    return NextResponse.json({
      success: true,
      deleted_visit_id: id,
      member_id: member.id,
      new_total_visits: newTotalVisits,
      new_punch_count: newPunchCount
    })
  } catch (err) {
    console.error('[DELETE /api/members/visits/[id]]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
