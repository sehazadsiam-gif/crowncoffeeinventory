export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { full_name, email, phone, date_of_birth, address, occupation, special_dates } = body

    // Validation
    if (!full_name || !email || !phone) {
      return NextResponse.json(
        { error: 'Full name, email, and phone are required.' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format.' },
        { status: 400 }
      )
    }

    // Phone format: should start with + and have country code
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      return NextResponse.json(
        { error: 'Phone number must have at least 10 digits.' },
        { status: 400 }
      )
    }

    if (special_dates && special_dates.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 special dates allowed.' },
        { status: 400 }
      )
    }

    // Check email uniqueness
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'This email is already registered.' },
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
        { error: 'This phone number is already registered.' },
        { status: 409 }
      )
    }

    // Insert member
    const memberData = {
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      status: 'pending',
      tier: 'silver',
      total_visits: 0,
      punch_count: 0
    }

    if (date_of_birth) memberData.date_of_birth = date_of_birth
    if (address) memberData.address = address.trim()
    if (occupation) memberData.occupation = occupation.trim()

    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert([memberData])
      .select()
      .single()

    if (memberError) {
      console.error('Member insert error:', memberError)
      return NextResponse.json(
        { error: 'Failed to submit application. Please try again.' },
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
          // Don't block if special dates fail
        }
      }
    }

    return NextResponse.json(
      { 
        success: true,
        member_id: member.id,
        message: 'Application submitted successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Apply error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
