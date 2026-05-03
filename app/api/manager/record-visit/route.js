import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'
import { sendFreeCoffeeEmail, sendFeedbackRequest } from '../../../../lib/email'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || (session.role !== 'manager' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { member_id } = await request.json()
    if (!member_id) return NextResponse.json({ error: 'member_id required' }, { status: 400 })

    // 1. Check no visit today
    const today = new Date().toISOString().split('T')[0]
    const { data: existingVisit } = await supabase
      .from('member_visits')
      .select('id')
      .eq('member_id', member_id)
      .gte('visited_at', today + 'T00:00:00')
      .lte('visited_at', today + 'T23:59:59')
      .single()

    if (existingVisit) {
      return NextResponse.json({ error: 'Visit already recorded for today' }, { status: 400 })
    }

    // 2. Insert visit
    const { data: visit, error: visitError } = await supabase
      .from('member_visits')
      .insert([{ member_id, recorded_by: 'manager' }])
      .select()
      .single()

    if (visitError) throw visitError

    // 3. Update member stats
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', member_id)
      .single()

    if (memberError) throw memberError

    const newTotalVisits = (member.total_visits || 0) + 1
    const newPunchCount = (member.punch_count || 0) + 1
    let newTier = member.tier
    let tierUpgraded = false

    if (newTotalVisits >= 25 && member.tier === 'silver') {
      newTier = 'gold'
      tierUpgraded = true
    }

    const { error: updateError } = await supabase
      .from('members')
      .update({
        total_visits: newTotalVisits,
        punch_count: newPunchCount,
        tier: newTier
      })
      .eq('id', member_id)

    if (updateError) throw updateError

    // 4. Free coffee check
    let freeCoffeeEarned = false
    if (newPunchCount % 10 === 0) {
      freeCoffeeEarned = true
      sendFreeCoffeeEmail({
        to: member.email,
        name: member.full_name,
        card_number: member.card_number
      }).catch(e => console.error('Free coffee email error:', e))
    }

    // 5. Feedback request
    sendFeedbackRequest({
      to: member.email,
      name: member.full_name,
      visit_id: visit.id
    }).catch(e => console.error('Feedback request email error:', e))

    return NextResponse.json({
      success: true,
      total_visits: newTotalVisits,
      punch_count: newPunchCount,
      tier: newTier,
      free_coffee_earned: freeCoffeeEarned,
      tier_upgraded: tierUpgraded
    })

  } catch (error) {
    console.error('Record visit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
