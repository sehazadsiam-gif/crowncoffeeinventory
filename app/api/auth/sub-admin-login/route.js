import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { verifyPassword, createSession, verifyMasterPin } from '../../../../lib/auth'
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limiter'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(clientIp, 6, 15 * 60 * 1000)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.error },
      { status: 429 }
    )
  }

  try {
    const { username, password } = await request.json()

    if (!username && !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Check Master PIN fallback
    if (verifyMasterPin(password) || verifyMasterPin(username)) {
      rateLimit.reset()
      const token = await createSession('master_admin', 'admin')

      const response = NextResponse.json({
        success: true,
        token,
        role: 'admin',
        username: 'admin'
      })

      response.cookies.set('cc_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      })
      response.cookies.set('cc_role', 'admin', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      })

      return response
    }

    const { data: subAdmin, error } = await supabaseAdmin
      .from('admin_accounts')
      .select('*')
      .eq('username', (username || '').toLowerCase().trim())
      .eq('role', 'sub_admin')
      .maybeSingle()

    if (error || !subAdmin) {
      rateLimit.recordFailure()
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const valid = await verifyPassword(password, subAdmin.password_hash)
    if (!valid) {
      rateLimit.recordFailure()
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    rateLimit.reset()
    const token = await createSession(subAdmin.id, 'sub_admin')

    const response = NextResponse.json({
      success: true,
      token,
      role: 'sub_admin',
      username: subAdmin.username
    })

    response.cookies.set('cc_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    })
    response.cookies.set('cc_role', 'sub_admin', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    })

    return response
  } catch (error) {
    console.error('Sub admin login error:', error)
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
