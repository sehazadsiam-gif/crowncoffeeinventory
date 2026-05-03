import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import { sendMemberApplicationConfirm, sendAdminMemberAlert } from '../../../lib/email'

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
      .eq('email', email)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'This email is already registered.' },
        { status: 409 }
      )
    }

    // Insert member
    const memberData = {
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      status: 'pending',
      tier: 'silver'
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

    // Insert special dates
    if (special_dates && special_dates.length > 0) {
      const datesToInsert = special_dates
        .filter(d => d.occasion_name && d.month && d.day)
        .map(d => ({
          member_id: member.id,
          occasion_name: d.occasion_name.trim(),
          month: parseInt(d.month),
          day: parseInt(d.day)
        }))

      if (datesToInsert.length > 0) {
        const { error: datesError } = await supabase
          .from('member_special_dates')
          .insert(datesToInsert)

        if (datesError) {
          console.error('Special dates insert error:', datesError)
        }
      }
    }

    // Send confirmation email to customer (non-blocking)
    sendMemberApplicationConfirm({
      to: email,
      name: full_name
    }).catch(err => console.error('Member confirmation email failed:', err))

    // Send admin notification (non-blocking)
    sendAdminMemberAlert({
      name: full_name,
      email,
      phone,
      occupation: occupation || 'Not provided',
      special_dates_count: special_dates ? special_dates.filter(d => d.occasion_name).length : 0
    }).catch(err => console.error('Admin alert email failed:', err))

    return NextResponse.json({
      success: true,
      name: full_name
    })

  } catch (error) {
    console.error('Membership apply error:', error)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
