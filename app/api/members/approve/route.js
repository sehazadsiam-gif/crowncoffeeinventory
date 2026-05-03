import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'
import { sendMemberApproved } from '../../../../lib/email'

export async function POST(request) {
  try {
    // Auth check
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { member_id } = await request.json()

    if (!member_id) {
      return NextResponse.json({ error: 'member_id is required' }, { status: 400 })
    }

    // Generate card number
    const { count, error: countError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .not('card_number', 'is', null)

    if (countError) {
      console.error('Card count error:', countError)
      return NextResponse.json({ error: 'Failed to generate card number' }, { status: 500 })
    }

    const year = new Date().getFullYear()
    const cardNumber = `CC-${year}-${String((count || 0) + 1).padStart(4, '0')}`

    const today = new Date().toISOString().split('T')[0]

    // Update member
    const { data: member, error: updateError } = await supabase
      .from('members')
      .update({
        status: 'active',
        card_number: cardNumber,
        member_since: today,
        tier: 'silver'
      })
      .eq('id', member_id)
      .select()
      .single()

    if (updateError) {
      console.error('Member approve error:', updateError)
      return NextResponse.json({ error: 'Failed to approve member' }, { status: 500 })
    }

    // Fetch special dates
    const { data: specialDates } = await supabase
      .from('member_special_dates')
      .select('*')
      .eq('member_id', member_id)

    // Send approval email with membership card (non-blocking)
    sendMemberApproved({
      to: member.email,
      name: member.full_name,
      card_number: cardNumber,
      member_since: today,
      tier: 'silver',
      special_dates: specialDates || []
    }).catch(err => console.error('Approval email failed:', err))

    return NextResponse.json({
      success: true,
      card_number: cardNumber
    })

  } catch (error) {
    console.error('Member approve error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
