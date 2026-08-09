/**
 * POST /api/rfid/route
 *
 * Unified Smart RFID Router
 * ─────────────────────────────────────────────────────────────────────
 * A single endpoint for any RFID reader or kiosk. Automatically decides
 * whether a tapped card belongs to a Staff member or a Customer member,
 * then routes the tap to the correct downstream logic.
 *
 * Priority:
 *   1. Found in `staff` table (is_active = true)  → Staff attendance log
 *   2. Found in `members` table (status = active) → Member visit punch
 *   3. Found in `staff` but inactive              → Error: "Staff card inactive"
 *   4. Found in `members` but not active          → Error: "Member card not active"
 *   5. Not found anywhere                         → Error: "Card not recognized"
 *
 * Body: { rfid_code, location?, timestamp? }
 *
 * Response: { routed_to: 'staff' | 'member', success, name, result }
 * ─────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { logAttendance } from '../../../../lib/attendance-service'

export const dynamic = 'force-dynamic'

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Build RFID variants to match (handles zero-padding differences between
 * what the reader sends and what is stored in the DB).
 */
function buildRfidVariants(rawCode) {
  const clean = String(rawCode).trim()
  const stripped = clean.replace(/^0+/, '') || '0'
  const padded10 = stripped.padStart(10, '0')
  return [...new Set([clean, clean.toUpperCase(), stripped, stripped.toUpperCase(), padded10])]
}

/**
 * Lookup a staff record by RFID (all variants, including numeric comparison).
 * Returns { data: staffRow | null, inactive: staffRow | null }
 */
async function findStaffByRfid(rfidCode) {
  const variants = buildRfidVariants(rfidCode)

  const orConditions = variants.map(v => `rfid_code.eq.${v}`)

  // Check active staff first
  const { data: activeStaff } = await supabaseAdmin
    .from('staff')
    .select('*')
    .eq('is_active', true)
    .or(orConditions.join(','))
    .maybeSingle()

  if (activeStaff) return { data: activeStaff, inactive: null }

  // Check inactive staff (for a better error message)
  const { data: inactiveStaff } = await supabaseAdmin
    .from('staff')
    .select('id, name, employee_id')
    .eq('is_active', false)
    .or(orConditions.join(','))
    .maybeSingle()

  if (inactiveStaff) return { data: null, inactive: inactiveStaff }

  // Last resort: numeric comparison for active staff
  const stripped = String(rfidCode).trim().replace(/^0+/, '') || '0'
  if (/^\d+$/.test(stripped)) {
    const numericVal = parseInt(stripped, 10)
    const { data: allActive } = await supabaseAdmin
      .from('staff')
      .select('*')
      .eq('is_active', true)
      .not('rfid_code', 'is', null)

    const match = (allActive || []).find(s => {
      const stored = String(s.rfid_code || '').trim().replace(/^0+/, '') || '0'
      return parseInt(stored, 10) === numericVal
    })
    if (match) return { data: match, inactive: null }
  }

  return { data: null, inactive: null }
}

/**
 * Lookup a member record by RFID code or card_number.
 * Returns { data: memberRow | null, inactive: memberRow | null }
 */
async function findMemberByRfid(rfidCode) {
  const clean = String(rfidCode).trim()

  const { data: members } = await supabaseAdmin
    .from('members')
    .select('*')
    .or(`rfid_code.eq.${clean},card_number.eq.${clean}`)
    .limit(2)

  if (!members || members.length === 0) return { data: null, inactive: null }

  const active = members.find(m => m.status === 'active')
  if (active) return { data: active, inactive: null }

  const inactive = members[0]
  return { data: null, inactive }
}

// ── Member punch logic ────────────────────────────────────────────────

async function handleMemberPunch(member, rfidCode, location) {
  // Enforce 1 punch per day
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const { data: todayVisits } = await supabaseAdmin
    .from('member_visits')
    .select('id, visited_at')
    .eq('member_id', member.id)
    .gte('visited_at', startOfToday.toISOString())
    .limit(1)

  if (todayVisits && todayVisits.length > 0) {
    const lastTime = new Date(todayVisits[0].visited_at).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
    return {
      success: false,
      already_punched_today: true,
      error: `Visit already recorded for ${member.full_name} today at ${lastTime}. Maximum 1 punch per day.`
    }
  }

  // Check card expiration
  if (member.card_expires_at && new Date(member.card_expires_at) < new Date()) {
    return {
      success: false,
      error: `Card expired on ${new Date(member.card_expires_at).toLocaleDateString('en-GB')}. Please renew at counter.`
    }
  }

  // Calculate new visit counts
  const newTotalVisits = (member.total_visits || 0) + 1
  let newPunchCount = (member.visit_punch_count || 0) + 1
  let newFreeCoffees = member.free_coffee_rewards_available || 0
  let rewardUnlocked = false

  if (newPunchCount >= 5) {
    newPunchCount = 0
    newFreeCoffees += 1
    rewardUnlocked = true
  }

  // Update member record
  const { error: updateErr } = await supabaseAdmin
    .from('members')
    .update({
      total_visits: newTotalVisits,
      visit_punch_count: newPunchCount,
      punch_count: newPunchCount,
      free_coffee_rewards_available: newFreeCoffees
    })
    .eq('id', member.id)

  if (updateErr) {
    console.error('[rfid/route] Member update error:', updateErr)
    return { success: false, error: 'Failed to record visit' }
  }

  // Log visit
  await supabaseAdmin.from('member_visits').insert({
    member_id: member.id,
    visited_at: new Date().toISOString(),
    recorded_by: 'rfid_tap',
    notes: `RFID Smart Router at ${location}`
  })

  // Log tap event
  await supabaseAdmin.from('member_rfid_taps').insert({
    member_id: member.id,
    rfid_code: rfidCode,
    tapped_at: new Date().toISOString(),
    location,
    visit_number: newTotalVisits,
    reward_earned: rewardUnlocked
  })

  // Fire notification emails async (non-blocking)
  try {
    const { sendRfidTapVisitEmail, sendFreeCoffeeEarnedEmail } = await import('../../../../lib/email')
    const updatedMember = { ...member, total_visits: newTotalVisits }
    sendRfidTapVisitEmail(updatedMember, newTotalVisits, newPunchCount, rewardUnlocked).catch(() => {})
    if (rewardUnlocked) {
      sendFreeCoffeeEarnedEmail(updatedMember).catch(() => {})
    }
  } catch (_) {
    // email errors must never break the punch
  }

  return {
    success: true,
    member: {
      id: member.id,
      full_name: member.full_name,
      card_number: member.card_number,
      tier: member.tier || 'silver',
      total_visits: newTotalVisits,
      visit_punch_count: newPunchCount,
      free_coffee_rewards_available: newFreeCoffees,
      card_expires_at: member.card_expires_at
    },
    visit_recorded: {
      total_visits: newTotalVisits,
      punch_count: newPunchCount,
      reward_unlocked: rewardUnlocked,
      free_coffees_available: newFreeCoffees
    }
  }
}

// ── Main route handler ────────────────────────────────────────────────

export async function POST(request) {
  try {
    const body = await request.json()
    const { rfid_code, location = 'Counter', timestamp } = body

    if (!rfid_code || typeof rfid_code !== 'string' || !rfid_code.trim()) {
      return NextResponse.json(
        { success: false, error: 'rfid_code is required' },
        { status: 400 }
      )
    }

    const cleanCode = rfid_code.trim()

    // ── Step 1: Check Staff table (highest priority) ───────────────────
    const { data: activeStaff, inactive: inactiveStaff } = await findStaffByRfid(cleanCode)

    if (activeStaff) {
      // Route to staff attendance
      const result = await logAttendance({
        identifier: activeStaff.id, // pass UUID for exact match
        timestamp: timestamp || undefined,
        source: 'rfid',
        notes: `Smart RFID router at ${location}`
      })

      return NextResponse.json({
        routed_to: 'staff',
        success: result.success,
        name: activeStaff.name,
        result
      }, { status: result.success || result.blocked ? 200 : 400 })
    }

    if (inactiveStaff) {
      return NextResponse.json({
        routed_to: 'staff',
        success: false,
        name: inactiveStaff.name,
        error: `Staff card for ${inactiveStaff.name} is inactive. Please contact management.`
      }, { status: 403 })
    }

    // ── Step 2: Check Members table ────────────────────────────────────
    const { data: activeMember, inactive: inactiveMember } = await findMemberByRfid(cleanCode)

    if (activeMember) {
      const result = await handleMemberPunch(activeMember, cleanCode, location)
      return NextResponse.json({
        routed_to: 'member',
        success: result.success,
        name: activeMember.full_name,
        result
      }, { status: result.success ? 200 : (result.already_punched_today ? 429 : 400) })
    }

    if (inactiveMember) {
      return NextResponse.json({
        routed_to: 'member',
        success: false,
        name: inactiveMember.full_name,
        error: `Membership card for ${inactiveMember.full_name} is ${inactiveMember.status}. Please contact the manager.`
      }, { status: 403 })
    }

    // ── Step 3: Not found anywhere ─────────────────────────────────────
    return NextResponse.json({
      routed_to: null,
      success: false,
      error: 'Card not recognized. Please register at the counter.'
    }, { status: 404 })

  } catch (err) {
    console.error('[POST /api/rfid/route]', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Server error' },
      { status: 500 }
    )
  }
}
