export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { full_name, email, phone, date_of_birth, address, occupation, special_dates } = body

    // Validation
    if (!full_name?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 9) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }

    // Check email uniqueness
    const { data: existingEmail } = await supabase
      .from('members')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingEmail) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 409 }
      )
    }

    // Check phone uniqueness
    const { data: existingPhone } = await supabase
      .from('members')
      .select('id')
      .eq('phone', phone.trim())
      .single()

    if (existingPhone) {
      return NextResponse.json(
        { error: 'This phone number is already registered' },
        { status: 409 }
      )
    }

    // Insert member with status = pending
    const { data: member, error: memberError } = await supabase
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
      .single()

    if (memberError) {
      console.error('Member insert error:', memberError)
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      )
    }

    // Insert special dates if provided
    if (special_dates && special_dates.length > 0) {
      const validDates = special_dates.filter(d => d.occasion_name && d.month && d.day)
      
      if (validDates.length > 0) {
        const { error: dateError } = await supabase
          .from('member_special_dates')
          .insert(validDates.map(d => ({
            member_id: member.id,
            occasion_name: d.occasion_name,
            month: parseInt(d.month),
            day: parseInt(d.day)
          })))

        if (dateError) {
          console.error('Special dates error:', dateError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      member_id: member.id,
      message: 'Application submitted successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('Apply error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    )
  }
}
