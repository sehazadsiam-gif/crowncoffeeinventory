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

    const { data: subAdmin, error } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .eq('role', 'sub_admin')
      .single()

    if (error || !subAdmin) {
      return Response.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const valid = await verifyPassword(password, subAdmin.password_hash)
    if (!valid) {
      return Response.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const token = await createSession(subAdmin.id, 'sub_admin')

    return Response.json({
      success: true,
      token,
      role: 'sub_admin',
      username: subAdmin.username
    })
  } catch (error) {
    console.error('Sub admin login error:', error)
    return Response.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
