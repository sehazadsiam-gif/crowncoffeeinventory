export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { sendMemberApproved } from '../../../../../lib/email'

export async function POST(request, { params }) {
  try {
    const { id } = params

    console.log('Approving member ID:', id)

    // Check current status first
    const { data: existing } = await supabase
      .from('members')
      .select('id, status, card_number, email, phone, full_name')
      .eq('id', id)

    const currentMember = existing?.[0]
    console.log('Current member:', currentMember)

    if (!currentMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // If already approved, return existing card
    if (currentMember.status === 'active' && currentMember.card_number) {
      return NextResponse.json({
        success: true,
        card_number: currentMember.card_number,
        message: 'Already approved'
      }, { status: 200 })
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

    console.log('Update result:', updated, updateError)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const updatedMember = updated?.[0]

    // Send email + WhatsApp async
    if (updatedMember?.email) {
      sendMemberApproved(updatedMember, cardNumber).catch(err => {
        console.error('Email error:', err.message)
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
