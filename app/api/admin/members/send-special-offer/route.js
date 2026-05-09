export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { validateSession } from '../../../../../lib/auth'
import { sendSpecialDateEmail, sendMemberOffer } from '../../../../../lib/email'

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
    } else if (offerType === 'custom' && customOffer) {
      await sendMemberOffer(member, customOffer)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send offer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
