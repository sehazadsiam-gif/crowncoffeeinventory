import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { validateSession } from '../../../lib/auth'
import { sendTierUpgradeEmail } from '../../../lib/email'

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const session = await validateSession(token)

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { member_id } = await request.json()
    if (!member_id) return NextResponse.json({ error: 'member_id required' }, { status: 400 })

    const { data: member, error } = await supabase
      .from('members')
      .select('full_name, email, card_number')
      .eq('id', member_id)
      .single()

    if (error || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    await sendTierUpgradeEmail({
      to: member.email,
      name: member.full_name,
      card_number: member.card_number
    })

    await supabase.from('member_notifications').insert([{
      member_id,
      type: 'tier_upgrade',
      subject: 'Gold Tier Upgrade',
      message: 'Manually triggered tier upgrade notification'
    }])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send tier upgrade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
