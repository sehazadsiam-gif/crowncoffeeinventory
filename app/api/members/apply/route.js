export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { full_name, email, phone, date_of_birth, address, occupation } = body

    console.log('New application:', { full_name, email, phone })

    if (!full_name || !email || !phone) {
      return NextResponse.json({ error: 'Name, email and phone are required' }, { status: 400 })
    }

    // Check email exists
    const { data: emailCheck } = await supabase
      .from('members')
      .select('id')
      .eq('email', email)

    if (emailCheck && emailCheck.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    // Check phone exists
    const { data: phoneCheck } = await supabase
      .from('members')
      .select('id')
      .eq('phone', phone)

    if (phoneCheck && phoneCheck.length > 0) {
      return NextResponse.json({ error: 'Phone already registered' }, { status: 409 })
    }

    // Insert member
    const { data, error } = await supabase
      .from('members')
      .insert([{
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        date_of_birth: date_of_birth || null,
        address: address || null,
        occupation: occupation || null,
        status: 'pending',
        tier: 'silver',
        total_visits: 0,
        punch_count: 0
      }])
      .select()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Member created:', data[0].id)

    return NextResponse.json({
      success: true,
      member_id: data[0].id
    }, { status: 200 })

  } catch (error) {
    console.error('Apply error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
