export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { validateSession } from '../../../../../lib/auth'
import { sendSpecialDateEmail, sendMemberOffer } from '../../../../../lib/email'
import { sendSpecialDateSMS, sendOfferSMS } from '../../../../../lib/sms'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || (session.role !== 'admin' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { member_id, offerType, customOffer } = await request.json()

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', member_id)
      .single()

    if (error || !member) {
      console.error('Member fetch error:', error)
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (offerType === 'birthday') {
      await sendSpecialDateEmail(member, 'Birthday')
      await sendSpecialDateSMS(member.phone, member.full_name, 'Birthday')
    } else if (offerType === 'custom' && customOffer) {
      await sendMemberOffer(member, customOffer)
      await sendOfferSMS(member.phone, customOffer.discount_percent || 10, customOffer.valid_days || 7)
    }

    // Log notification
    await supabase.from('member_notifications').insert([{
      member_id: member.id,
      type: 'offer',
      subject: offerType === 'birthday' ? 'Birthday Offer' : (customOffer?.title || 'Special Offer'),
      message: offerType === 'birthday' ? 'Happy Birthday SMS + Email sent' : `Special offer: ${customOffer?.discount_percent}% sent via SMS + Email`,
      status: 'sent'
    }]).then(({ error }) => {
      if (error) console.error('Log error:', error)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send offer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
