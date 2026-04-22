import { supabase } from '../../../../lib/supabase'
import { verifyPassword, createSession } from '../../../../lib/auth'

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return Response.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    const { data: account, error } = await supabase
      .from('staff_accounts')
      .select('*, staff(*)')
      .eq('username', username.toLowerCase().trim())
      .single()

    if (error || !account) {
      return Response.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    if (!account.is_active) {
      return Response.json(
        { error: 'Your account has been deactivated. Contact admin.' },
        { status: 403 }
      )
    }

    const valid = await verifyPassword(password, account.password_hash)
    if (!valid) {
      return Response.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const token = await createSession(account.id, 'staff')

    return Response.json({
      success: true,
      token,
      role: 'staff',
      staff_id: account.staff_id,
      name: account.staff.name,
      designation: account.staff.designation
    })
  } catch (error) {
    console.error('Staff login error:', error)
    return Response.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
