export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { validateSession } from '../../../../../lib/auth'
import { sendMemberApproved } from '../../../../../lib/email'

export async function PATCH(request, { params }) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    console.log('Approving member:', id)

    // Generate card number
    const year = new Date().getFullYear()
    const { count, error: countError } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (countError) {
      console.error('Count error:', countError)
      throw new Error(`Failed to count active members: ${countError.message}`)
    }

    const cardNumber = `CC-${year}-${String((count || 0) + 1).padStart(4, '0')}`
    console.log('Generated card number:', cardNumber)

    // Update member to active
    const { data: member, error: updateError } = await supabase
      .from('members')
      .update({
        status: 'active',
        card_number: cardNumber,
        member_since: new Date().toISOString().split('T')[0],
        tier: 'silver'
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error(`Failed to update member: ${updateError.message}`)
    }

    if (!member) {
      throw new Error('Member not found after update')
    }

    // Send approval email + WhatsApp
    try {
      await sendMemberApproved(member, cardNumber)
    } catch (emailError) {
      console.error('Email send error (non-blocking):', emailError)
    }

    return NextResponse.json(
      { success: true, message: 'Member approved', card_number: cardNumber },
      { status: 200 }
    )
  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
