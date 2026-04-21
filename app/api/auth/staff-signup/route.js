import { supabase } from '../../../../lib/supabase'
import { hashPassword, createSession } from '../../../../lib/auth'

export async function POST(request) {
  try {
    const { mobile_number, password, staff_id } = await request.json()

    if (!mobile_number || !password || !staff_id) {
      return Response.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if staff exists
    const { data: staffMember, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staff_id)
      .single()

    if (staffError || !staffMember) {
      return Response.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Check if mobile already registered
    const { data: existing } = await supabase
      .from('staff_accounts')
      .select('id')
      .eq('mobile_number', mobile_number)
      .single()

    if (existing) {
      return Response.json(
        { error: 'This mobile number is already registered' },
        { status: 409 }
      )
    }

    // Check if staff already has account
    const { data: existingStaff } = await supabase
      .from('staff_accounts')
      .select('id')
      .eq('staff_id', staff_id)
      .single()

    if (existingStaff) {
      return Response.json(
        { error: 'This staff member already has an account' },
        { status: 409 }
      )
    }

    const password_hash = await hashPassword(password)

    const { data: account, error: insertError } = await supabase
      .from('staff_accounts')
      .insert([{ staff_id, mobile_number, password_hash }])
      .select()
      .single()

    if (insertError) throw insertError

    const token = await createSession(account.id, 'staff')

    return Response.json({
      success: true,
      token,
      role: 'staff',
      staff_id,
      name: staffMember.name
    })
  } catch (error) {
    console.error('Staff signup error:', error)
    return Response.json(
      { error: 'Signup failed. Please try again.' },
      { status: 500 }
    )
  }
}
