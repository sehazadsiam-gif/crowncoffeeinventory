import { supabase } from '../../../../lib/supabase'
import { hashPassword } from '../../../../lib/auth'

export async function POST(request) {
  try {
    const { staff_id, username, password } = await request.json()

    if (!staff_id || !username || !password) {
      return Response.json(
        { error: 'Staff ID, username, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const cleanUsername = username.toLowerCase().trim()

    // Check if another user is using this username
    const { data: existing } = await supabase
      .from('staff_accounts')
      .select('id, staff_id')
      .eq('username', cleanUsername)
      .single()

    if (existing && existing.staff_id !== staff_id) {
      return Response.json(
        { error: 'This username is already taken by another staff member' },
        { status: 409 }
      )
    }

    const password_hash = await hashPassword(password)

    // Check if staff already has account to update or insert
    const { data: accountExists } = await supabase
      .from('staff_accounts')
      .select('id')
      .eq('staff_id', staff_id)
      .single()

    let resultError;

    if (accountExists) {
      // Update existing
      const { error } = await supabase
        .from('staff_accounts')
        .update({ username: cleanUsername, password_hash })
        .eq('staff_id', staff_id)
      resultError = error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('staff_accounts')
        .insert([{ staff_id, username: cleanUsername, password_hash }])
      resultError = error;
    }

    if (resultError) throw resultError

    return Response.json({ success: true, message: 'Credentials saved successfully' })

  } catch (error) {
    console.error('Set credentials error:', error)
    return Response.json(
      { error: 'Failed to save credentials. Please try again.' },
      { status: 500 }
    )
  }
}
