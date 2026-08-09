export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'
import { sendVisitConfirmationEmail, sendFeedbackRequest, sendTierUpgradeEmail } from '../../../../lib/email'
import { sendFreeCoffeeSMS, sendVisitRecordedSMS, sendTierUpgradeSMS } from '../../../../lib/sms'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || (session.role !== 'manager' && (session.role !== 'admin' && session.role !== 'sub_admin'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { member_id } = await request.json()

    if (!member_id) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 })
    }

    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', member_id)

    if (memberError || !members || members.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const member = members[0]

    if (member.status !== 'active') {
      return NextResponse.json({ error: 'Member is not active' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: todayVisits } = await supabase
      .from('member_visits')
      .select('id')
      .eq('member_id', member_id)
      .gte('visited_at', today.toISOString())
      .lt('visited_at', tomorrow.toISOString())

    if (todayVisits && todayVisits.length > 0) {
      return NextResponse.json({ error: 'Visit already recorded today for this member' }, { status: 400 })
    }

    const { data: visits, error: visitError } = await supabase
      .from('member_visits')
      .insert([{
        member_id: member_id,
        visited_at: new Date().toISOString(),
        recorded_by: 'manager'
      }])
      .select()

    if (visitError) throw visitError

    const visit = visits[0]

    const newVisits = (member.total_visits || 0) + 1
    let newPunchCount = (member.visit_punch_count || member.punch_count || 0) + 1
    let newFreeCoffees = member.free_coffee_rewards_available || 0
    let freeCoffeeEarned = false

    if (newPunchCount >= 5) {
      newPunchCount = 0
      newFreeCoffees += 1
      freeCoffeeEarned = true
    }

    let newTier = member.tier
    let tierUpgraded = false
    if (newVisits >= 11 && member.tier === 'silver') {
      newTier = 'gold'
      tierUpgraded = true
    }

    const { error: updateError } = await supabase
      .from('members')
      .update({
        total_visits: newVisits,
        punch_count: newPunchCount,
        visit_punch_count: newPunchCount,
        free_coffee_rewards_available: newFreeCoffees,
        tier: newTier
      })
      .eq('id', member_id)

    if (updateError) throw updateError

    sendFeedbackRequest(member, visit.id)
      .catch(err => console.error('Feedback email error:', err))

    sendVisitRecordedSMS(member.phone, member.full_name, newVisits, newPunchCount)
      .catch(err => console.error('Visit SMS error:', err))
      
    const currentPunch = newPunchCount % 5
    sendVisitConfirmationEmail(member, { current_punch: currentPunch === 0 ? 5 : currentPunch }, tierUpgraded)
      .catch(err => console.error('Visit email error:', err))

    if (freeCoffeeEarned) {
      sendFreeCoffeeSMS(member.phone, member.full_name, member.card_number)
        .catch(err => console.error('Free coffee SMS error:', err))
    }

    if (tierUpgraded) {
      sendTierUpgradeEmail(member)
        .catch(err => console.error('Tier upgrade email error:', err))
      sendTierUpgradeSMS(member.phone, member.full_name)
        .catch(err => console.error('Tier upgrade SMS error:', err))
    }

    return NextResponse.json({
      success: true,
      total_visits: newVisits,
      punch_count: newPunchCount,
      tier: newTier,
      free_coffee_earned: freeCoffeeEarned,
      tier_upgraded: tierUpgraded
    }, { status: 200 })

  } catch (error) {
    console.error('Record visit error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
