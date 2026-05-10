export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'
import { sendOfferSMS } from '../../../../lib/sms'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { member_id, discount, valid_days } = await request.json()

    if (!member_id || !discount || !valid_days) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get member
    const { data: members } = await supabase
      .from('members')
      .select('*')
      .eq('id', member_id)

    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const member = members[0]

    // Send SMS
    await sendOfferSMS(member.phone, discount, valid_days)

    // Log in database
    await supabase
      .from('member_notifications')
      .insert([{
        member_id: member_id,
        type: 'offer',
        subject: `Special Offer: ${discount}% Discount`,
        message: `Special offer! Get ${discount}% discount on all items. Valid for ${valid_days} days.`,
        sent_at: new Date().toISOString(),
        status: 'sent'
      }])
      .catch(err => console.error('Notification log error:', err))

    return NextResponse.json({
      success: true,
      message: `Offer SMS sent to ${member.phone}`
    }, { status: 200 })

  } catch (error) {
    console.error('Send offer error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
