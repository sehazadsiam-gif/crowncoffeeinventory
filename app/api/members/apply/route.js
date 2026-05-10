export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { sendMemberApplicationConfirm } from '../../../../lib/email'
import { sendMemberApplicationConfirmSMS } from '../../../../lib/sms'

export async function POST(request) {
  try {
    const body = await request.json()
    const { full_name, email, phone, date_of_birth, address, occupation, special_dates } = body

    console.log('Apply request:', { full_name, email, phone })

    // Validation
    if (!full_name?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 9) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    }

    // Check email - use count instead
    const { count: emailCount, error: emailError } = await supabase
      .from('members')
      .select('id', { count: 'exact' })
      .eq('email', email.toLowerCase())

    if (emailCount && emailCount > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    // Check phone - use count instead
    const { count: phoneCount, error: phoneError } = await supabase
      .from('members')
      .select('id', { count: 'exact' })
      .eq('phone', phone.trim())

    if (phoneCount && phoneCount > 0) {
      return NextResponse.json({ error: 'Phone already registered' }, { status: 409 })
    }

    // Insert member
    const { data: memberArray, error: insertError } = await supabase
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

    if (insertError || !memberArray || memberArray.length === 0) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create member' }, { status: 500 })
    }

    const newMember = memberArray[0]

    // Insert special dates if provided
    if (special_dates && special_dates.length > 0) {
      const validDates = special_dates.filter(d => d.occasion_name && d.month && d.day)
      if (validDates.length > 0) {
        await supabase
          .from('member_special_dates')
          .insert(validDates.map(d => ({
            member_id: newMember.id,
            occasion_name: d.occasion_name,
            month: parseInt(d.month),
            day: parseInt(d.day)
          })))
          .catch(err => console.error('Special dates error:', err))
      }
    }

    console.log('Member created:', newMember.id)

    // Send Notifications (Async, non-blocking)
    sendMemberApplicationConfirm(newMember).catch(err => console.error('Apply email error:', err))
    sendMemberApplicationConfirmSMS(newMember.phone, newMember.full_name).catch(err => console.error('Apply SMS error:', err))

    return NextResponse.json({
      success: true,
      member_id: newMember.id,
      message: 'Application submitted successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('Apply error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
