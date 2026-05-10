// app/api/manager/record-visit/route.js - Complete file

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

    // Get TODAY'S DATE (YYYY-MM-DD format only, no time)
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayDateOnly = `${year}-${month}-${day}`

    console.log('Checking visit for:', { member_id, todayDateOnly })

    // Check if THIS MEMBER already visited TODAY
    const { data: todayVisits, error: checkError } = await supabase
      .from('member_visits')
      .select('id, visited_at')
      .eq('member_id', member_id)
      .gte('visited_at', `${todayDateOnly}T00:00:00`)
      .lt('visited_at', `${todayDateOnly}T23:59:59`)

    console.log('Today visits:', todayVisits)

    if (checkError) {
      console.error('Check error:', checkError)
      throw checkError
    }

    // If member already visited today, block it
    if (todayVisits && todayVisits.length > 0) {
      return NextResponse.json(
        {
          error: 'Member already visited today. Can record only 1 visit per day per member.',
          already_visited: true,
          last_visit: todayVisits[0].visited_at
        },
        { status: 400 }
      )
    }

    // Record visit
    const now = new Date().toISOString()

    const { error: visitError } = await supabase
      .from('member_visits')
      .insert([{
        member_id,
        visited_at: now,
        recorded_by: recorded_by || 'manager'
      }])

    if (visitError) {
      console.error('Visit insert error:', visitError)
      throw visitError
    }

    // Get updated member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', member_id)
      .single()

    if (memberError) throw memberError

    const newVisits = (member.total_visits || 0) + 1
    const newPunches = (member.punch_count || 0) + 1
    const newTier = newVisits >= 11 ? 'gold' : 'silver'

    // Update member stats
    const { error: updateError } = await supabase
      .from('members')
      .update({
        total_visits: newVisits,
        punch_count: newPunches,
        tier: newTier
      })
      .eq('id', member_id)

    if (updateError) throw updateError

    // Get free coffee progress
    const freeCoffeeProgress = {
      current_punch: newPunches % 6,
      total_earned: Math.floor(newPunches / 6)
    }

    // Send confirmation email + WhatsApp
    try {
      await sendVisitConfirmationEmail(
        {
          ...member,
          total_visits: newVisits,
          email: member.email,
          phone: member.phone
        },
        freeCoffeeProgress,
        newVisits >= 11
      )
    } catch (emailError) {
      console.log('Email/WhatsApp send failed (but visit recorded):', emailError.message)
    }

    // Check if free coffee earned
    const freeCoffeeEarned = (newPunches % 6 === 0)

    return NextResponse.json(
      {
        success: true,
        visits: newVisits,
        punch_count: newPunches,
        tier: newTier,
        free_coffee_earned: freeCoffeeEarned,
        message: freeCoffeeEarned
          ? `Visit recorded! Free coffee earned! (Total visits: ${newVisits})`
          : `Visit recorded! Total visits: ${newVisits}`
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Visit error:', error)
    return NextResponse.json(
      { error: error.message || 'Error recording visit' },
      { status: 500 }
    )
  }
}