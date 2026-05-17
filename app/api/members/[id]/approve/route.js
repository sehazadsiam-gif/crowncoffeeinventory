export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { validateSession } from '../../../../../lib/auth'
import { sendMemberApproved } from '../../../../../lib/email'
import { sendMemberApprovedSMS } from '../../../../../lib/sms'

export async function POST(request, context) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = context?.params?.id
    if (!id) {
      return NextResponse.json({ error: 'No member ID' }, { status: 400 })
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-6)
    const cardNumber = `CC-${year}${month}${day}-${timestamp}`

    const { data, error } = await supabase
      .from('members')
      .update({
        status: 'active',
        card_number: cardNumber,
        member_since: now.toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const member = data[0]

    sendMemberApproved(member, cardNumber)
      .catch(err => console.error('Email error:', err))
    
    sendMemberApprovedSMS(member.phone, member.full_name, cardNumber)
      .catch(err => console.error('SMS error:', err))

    return NextResponse.json({
      success: true,
      card_number: cardNumber
    }, { status: 200 })

  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
