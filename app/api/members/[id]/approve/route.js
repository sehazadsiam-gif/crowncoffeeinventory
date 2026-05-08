export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'
import { sendMemberApproved } from '../../../../../lib/email'

export async function POST(request, context) {
  try {
    const id = context?.params?.id
    if (!id) return NextResponse.json({ error: 'No ID' }, { status: 400 })

    const now = new Date()
    const cardNumber = `CC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Date.now().toString().slice(-6)}`

    const { data, error } = await supabase
      .from('members')
      .update({
        status: 'active',
        card_number: cardNumber,
        member_since: now.toISOString()
      })
      .eq('id', id)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    sendMemberApproved(data[0], cardNumber).catch(e => console.error('Email error:', e))

    return NextResponse.json({ success: true, card_number: cardNumber }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
