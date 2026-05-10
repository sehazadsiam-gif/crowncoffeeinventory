export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { sendMemberApproved } from '../../../../../lib/email'
import { sendMemberApprovedSMS } from '../../../../../lib/sms'

export async function POST(request, context) {
  try {
    const id = context?.params?.id

    if (!id) {
      return NextResponse.json({ error: 'No member ID' }, { status: 400 })
    }

    // Generate card number
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-6)
    const cardNumber = `CC-${year}${month}${day}-${timestamp}`

    // Update member - simple, no free coffee columns
    const { data: updated, error: updateError } = await supabase
      .from('members')
      .update({
        status: 'active',
        card_number: cardNumber,
        member_since: now.toISOString()
      })
      .eq('id', id)
      .select()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const updatedMember = updated[0]

    // Send email async
    if (updatedMember?.email) {
      sendMemberApproved(updatedMember, cardNumber).catch(err => {
        console.error('Email error:', err.message)
      })
      // Send SMS
      sendMemberApprovedSMS(updatedMember.phone, updatedMember.full_name, cardNumber).catch(err => {
        console.error('SMS error:', err.message)
      })
    }

    return NextResponse.json({
      success: true,
      card_number: cardNumber,
      message: 'Member approved'
    }, { status: 200 })

  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
