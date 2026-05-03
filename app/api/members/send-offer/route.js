import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { validateSession } from '../../../../lib/auth'
import { sendMemberOffer } from '../../../../lib/email'

export async function POST(request) {
  try {
    // Auth check
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { member_id, subject, message, discount_percent, valid_days } = await request.json()

    if (!member_id || !subject || !message) {
      return NextResponse.json({ error: 'member_id, subject, and message are required' }, { status: 400 })
    }

    // Fetch member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', member_id)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Send offer email
    await sendMemberOffer({
      to: member.email,
      name: member.full_name,
      card_number: member.card_number,
      subject,
      message,
      discount: discount_percent || 10,
      valid_days: valid_days || 7
    })

    // Log notification
    await supabase.from('member_notifications').insert([{
      member_id,
      type: 'offer',
      subject,
      message,
      status: 'sent'
    }])

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Send offer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
