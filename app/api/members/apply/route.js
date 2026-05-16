export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { sendMemberApplicationConfirm, sendAdminMemberAlert } from '../../../../lib/email'
import { sendMemberApplicationConfirmSMS } from '../../../../lib/sms'

export async function POST(request) {
  try {
    const body = await request.json()
    const { full_name, email, phone, date_of_birth, address, occupation, special_dates } = body

    if (!full_name || !email || !phone) {
      return NextResponse.json({ error: 'Name, email and phone are required' }, { status: 400 })
    }

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 9) {
      return NextResponse.json({ error: 'Phone must be at least 9 digits' }, { status: 400 })
    }

    const { data: emailCheck } = await supabase
      .from('members')
      .select('id')
      .eq('email', email.toLowerCase())

    if (emailCheck && emailCheck.length > 0) {
      return NextResponse.json({ error: 'This email is already registered' }, { status: 409 })
    }

    const { data: phoneCheck } = await supabase
      .from('members')
      .select('id')
      .eq('phone', phone.trim())

    if (phoneCheck && phoneCheck.length > 0) {
      return NextResponse.json({ error: 'This phone number is already registered' }, { status: 409 })
    }

    const { data: members, error: insertError } = await supabase
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

    if (insertError || !members || members.length === 0) {
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
    }

    const member = members[0]

    if (special_dates && special_dates.length > 0) {
      const validDates = special_dates.filter(d => d.occasion_name && d.month && d.day)
      if (validDates.length > 0) {
        await supabase
          .from('member_special_dates')
          .insert(validDates.map(d => ({
            member_id: member.id,
            occasion_name: d.occasion_name,
            month: parseInt(d.month),
            day: parseInt(d.day)
          })))
          .catch(err => console.error('Special dates error:', err))
      }
    }

    sendMemberApplicationConfirm(member)
      .catch(err => console.error('Email error:', err))
    
    sendMemberApplicationConfirmSMS(member.phone, member.full_name)
      .catch(err => console.error('SMS error:', err))
    
    sendAdminMemberAlert({ 
      name: member.full_name, 
      email: member.email, 
      phone: member.phone, 
      special_dates_count: special_dates?.length || 0 
    }).catch(err => console.error('Admin alert error:', err))

    return NextResponse.json({
      success: true,
      member_id: member.id,
      name: member.full_name
    }, { status: 200 })

  } catch (error) {
    console.error('Apply error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
