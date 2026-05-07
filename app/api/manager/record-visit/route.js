export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'
import { sendVisitConfirmationEmail } from '../../../../lib/email'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || (session.role !== 'manager' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { member_id, recorded_by } = await request.json()

    // Check if already visited today
    const today = new Date().toISOString().split('T')[0]
    
    const { data: todayVisits, error: checkError } = await supabase
      .from('member_visits')
      .select('id')
      .eq('member_id', member_id)
      .gte('visited_at', today + 'T00:00:00')
      .lte('visited_at', today + 'T23:59:59')
    
    if (checkError) throw checkError

    if (todayVisits && todayVisits.length > 0) {
      return NextResponse.json({ 
        error: 'Member already visited today. Can only record 1 visit per day.',
        already_visited: true
      }, { status: 400 })
    }

    // Record visit
    const { error: visitError } = await supabase
      .from('member_visits')
      .insert([{
        member_id,
        visited_at: new Date().toISOString(),
        recorded_by: recorded_by || 'manager'
      }])

    if (visitError) throw visitError

    // Update member stats
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('id', member_id)
      .single()

    if (!member) throw new Error('Member not found')

    const newVisits = (member.total_visits || 0) + 1
    const newPunches = (member.punch_count || 0) + 1
    const newTier = newVisits >= 25 ? 'gold' : 'silver'

    const { error: updateError } = await supabase
      .from('members')
      .update({
        total_visits: newVisits,
        punch_count: newPunches,
        tier: newTier
      })
      .eq('id', member_id)

    if (updateError) throw updateError

    // Send confirmation email
    const freeCoffeeProgress = {
      current_punch: newPunches % 10,
      total_earned: Math.floor(newPunches / 10)
    }

    await sendVisitConfirmationEmail(
      { 
        ...member, 
        total_visits: newVisits,
        email: member.email 
      },
      freeCoffeeProgress,
      newVisits >= 25
    )

    return NextResponse.json({ 
      success: true, 
      visits: newVisits,
      punch_count: newPunches,
      tier: newTier,
      free_coffee_earned: newPunches % 10 === 0
    }, { status: 200 })
  } catch (error) {
    console.error('Visit error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
