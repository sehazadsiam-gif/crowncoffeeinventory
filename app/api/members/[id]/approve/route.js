export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { sendMemberApproved } from '../../../../../lib/email'

export async function POST(request, context) {
  try {
    const id = context?.params?.id
    console.log('Approving member ID:', id)
    console.log('Context:', JSON.stringify(context))

    if (!id) {
      return NextResponse.json({ error: 'No member ID provided' }, { status: 400 })
    }

    // Generate card number
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-6)
    const cardNumber = `CC-${year}${month}${day}-${timestamp}`

    // Calculate 30-day free coffee expiry
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 30)

    // Update member status
    const { data: updated, error: updateError } = await supabase
      .from('members')
      .update({
        status: 'active',
        card_number: cardNumber,
        member_since: now.toISOString(),
        free_coffee_claimed: false,
        free_coffee_expires_at: expiryDate.toISOString()
      })
      .eq('id', id)
      .select()

    console.log('Update result:', updated, 'Error:', updateError)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Member not found or not updated' }, { status: 404 })
    }

    const updatedMember = updated[0]

    // Send email async
    if (updatedMember?.email) {
      sendMemberApproved(updatedMember, cardNumber).catch(err => {
        console.error('Email error:', err.message)
      })
    }

    return NextResponse.json({
      success: true,
      card_number: cardNumber,
      message: 'Member approved successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
