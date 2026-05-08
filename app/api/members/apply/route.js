export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

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

    // Check email exists
    const { data: existingEmail, error: emailError } = await supabase
      .from('members')
      .select('id', { count: 'exact' })
      .eq('email', email.toLowerCase())

    if (emailError) {
      console.error('Email check error:', emailError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (existingEmail && existingEmail.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    // Check phone exists
    const { data: existingPhone, error: phoneError } = await supabase
      .from('members')
      .select('id', { count: 'exact' })
      .eq('phone', phone.trim())

    if (phoneError) {
      console.error('Phone check error:', phoneError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (existingPhone && existingPhone.length > 0) {
      return NextResponse.json({ error: 'Phone already registered' }, { status: 409 })
    }

    // Insert member
    const { data: member, error: insertError } = await supabase
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

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create member' }, { status: 500 })
    }

    const newMember = member?.[0]
    if (!newMember) {
      return NextResponse.json({ error: 'Member not created' }, { status: 500 })
    }

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

    return NextResponse.json({
      success: true,
      member_id: newMember.id,
      message: 'Application submitted'
    }, { status: 200 })

  } catch (error) {
    console.error('Apply error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
