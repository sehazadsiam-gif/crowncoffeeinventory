export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'
import { sendMemberApproved } from '../../../../lib/email'
import { sendWhatsAppMembershipApproval } from '../../../../lib/whatsapp'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || (session.role !== 'admin' && session.role !== 'sub_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { member_id } = await request.json()

    // Generate card number
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')

    const cardNumber = `CC-${year}-${String((count || 0) + 1).padStart(4, '0')}`

    // Update member
    const { data: member, error: updateError } = await supabase
      .from('members')
      .update({
        status: 'active',
        card_number: cardNumber,
        member_since: new Date().toISOString().split('T')[0],
        tier: 'silver'
      })
      .eq('id', member_id)
      .select()
      

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error(`Failed to update member: ${updateError.message}`)
    }

    if (!member) {
      throw new Error('Member not found after update')
    }

    // Send approval notifications (Email + WhatsApp)
    try {
      await sendMemberApproved(member[0], cardNumber)
    } catch (notifError) {
      console.error('Notification error (non-blocking):', notifError)
    }

    return NextResponse.json({ success: true, card_number: cardNumber }, { status: 200 })
  } catch (error) {
    console.error('Approval error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
