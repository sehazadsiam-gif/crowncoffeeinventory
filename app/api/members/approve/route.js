export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'
import { sendMemberApproved, sendMembershipCardEmail } from '../../../../lib/email'
import { sendWhatsAppMembershipApproval } from '../../../../lib/whatsapp'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || session.role !== 'admin') {
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
        member_since: new Date().toISOString(),
        tier: 'silver'
      })
      .eq('id', member_id)
      .select()
      .single()

    if (updateError) throw updateError

    // Send card email
    await sendMembershipCardEmail(member, cardNumber)

    // Fetch special dates for the approval email
    const { data: specialDates } = await supabase
      .from('member_special_dates')
      .select('*')
      .eq('member_id', member_id)

    // Also send approval email for record
    await sendMemberApproved({
      to: member.email,
      name: member.full_name,
      card_number: cardNumber,
      member_since: member.member_since,
      tier: 'silver',
      special_dates: specialDates || []
    })

    // Send WhatsApp approval
    if (member.phone) {
      await sendWhatsAppMembershipApproval(member.phone, member, cardNumber)
    }

    return NextResponse.json({ success: true, card_number: cardNumber }, { status: 200 })
  } catch (error) {
    console.error('Approval error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
