export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { validateSession } from '../../../../../lib/auth'
import { sendMemberApproved } from '../../../../../lib/email'

export async function POST(request, { params }) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Generate unique card number
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const day = String(new Date().getDate()).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-6)
    const cardNumber = `CC-${year}${month}${day}-${timestamp}`

    // Calculate 30-day expiry
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 30)

    // Update member
    const { data: member, error: updateError } = await supabase
      .from('members')
      .update({
        status: 'active',
        card_number: cardNumber,
        member_since: new Date().toISOString(),
        free_coffee_claimed: false,
        free_coffee_expires_at: expiryDate.toISOString()
      })
      .eq('id', id)
      .select()
      

    if (updateError) throw updateError

    // Send email + WhatsApp async (don't block response)
    sendMemberApproved(member, cardNumber).catch(err => {
      console.error('Email error:', err)
    })

    return NextResponse.json({
      success: true,
      message: 'Member approved',
      card_number: cardNumber
    }, { status: 200 })

  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to approve'
    }, { status: 500 })
  }
}
