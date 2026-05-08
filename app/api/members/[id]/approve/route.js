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

    // Generate unique card number with timestamp to avoid duplicates
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const day = String(new Date().getDate()).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-6)
    
    const cardNumber = `CC-${year}${month}${day}-${timestamp}`

    // Update member to active
    const { data: member, error: updateError } = await supabase
      .from('members')
      .update({
        status: 'active',
        card_number: cardNumber,
        member_since: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error(`Failed to update member: ${updateError.message}`)
    }

    // Send approval email + WhatsApp
    try {
      await sendMemberApproved(member, cardNumber)
    } catch (emailError) {
      console.log('Email send error (member approved):', emailError)
    }

    return NextResponse.json(
      { success: true, message: 'Member approved successfully', card_number: cardNumber },
      { status: 200 }
    )
  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve member' },
      { status: 500 }
    )
  }
}
