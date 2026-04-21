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

    const { data: admin, error } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .single()

    if (error || !admin) {
      return Response.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const valid = await verifyPassword(password, admin.password_hash)
    if (!valid) {
      return Response.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const token = await createSession(admin.id, 'admin')

    return Response.json({
      success: true,
      token,
      role: 'admin',
      username: admin.username
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return Response.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
