import { NextResponse } from 'next/server'
import { verifyPassword, createSession } from '../../../../lib/auth'
import { supabase } from '../../../../lib/supabase'

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    // Query admin_accounts where role is manager
    const { data: user, error } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('username', username)
      .eq('role', 'manager')
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid manager credentials' }, { status: 401 })
    }

    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid manager credentials' }, { status: 401 })
    }

    // Create session with role manager
    const token = await createSession(user.id, 'manager')

    return NextResponse.json({
      success: true,
      token,
      role: 'manager',
      username: user.username
    })
  } catch (error) {
    console.error('Manager login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
