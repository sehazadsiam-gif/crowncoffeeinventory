import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { verifyPassword, createSession, verifyMasterPin } from '../../../../lib/auth'
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limiter'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(clientIp, 5, 15 * 60 * 1000)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.error },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { username, password, pin } = body

    const candidatePin = pin || password || username || ''

    // 1. PIN-based Master Authentication
    if (candidatePin && verifyMasterPin(candidatePin)) {
      rateLimit.reset()
      const token = await createSession('master_admin', 'admin')

      const response = NextResponse.json({
        success: true,
        token,
        role: 'admin',
        username: 'admin'
      })

      // Set secure HTTP-only session cookie
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

    // 2. Username & Password Credentials Authentication
    if (!username || !password) {
      rateLimit.recordFailure()
      return NextResponse.json(
        { error: 'Invalid PIN or credentials' },
        { status: 400 }
      )
    }

    const { data: admin, error } = await supabaseAdmin
      .from('admin_accounts')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .eq('role', 'admin')
      .maybeSingle()

    if (error || !admin) {
      rateLimit.recordFailure()
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const valid = await verifyPassword(password, admin.password_hash)
    if (!valid) {
      rateLimit.recordFailure()
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    rateLimit.reset()
    const token = await createSession(admin.id, 'admin')

    const response = NextResponse.json({
      success: true,
      token,
      role: 'admin',
      username: admin.username
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
  } catch (error) {
    console.error('[AdminLogin] Error:', error)
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
