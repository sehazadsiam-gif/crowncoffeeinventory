import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { verifyPassword, createSession } from '../../../../lib/auth'
import { checkRateLimit, getClientIp } from '../../../../lib/rate-limiter'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(clientIp, 8, 15 * 60 * 1000)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: rateLimit.error },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const rawPassword = body.password || body.passcode || body.pin || ''
    const rawUsername = body.username || ''

    if (!rawPassword && !rawUsername) {
      return NextResponse.json(
        { error: 'Passcode is required' },
        { status: 400 }
      )
    }

    const passcode = rawPassword.toLowerCase().trim()
    let candidateUsername = rawUsername.toLowerCase().trim()

    if (!candidateUsername && passcode.includes('@cc')) {
      candidateUsername = passcode.split('@cc')[0].trim()
    }

    let account = null

    // 1. Try direct lookup by username if available
    if (candidateUsername) {
      const { data } = await supabaseAdmin
        .from('staff_accounts')
        .select('*, staff(*)')
        .eq('username', candidateUsername)
        .maybeSingle()

      if (data) {
        account = data
      }
    }

    // 2. Fallback: match by password verification across active staff accounts
    if (!account) {
      const { data: allAccounts } = await supabaseAdmin
        .from('staff_accounts')
        .select('*, staff(*)')

      if (allAccounts && allAccounts.length > 0) {
        for (const candidate of allAccounts) {
          const isMatch = await verifyPassword(passcode, candidate.password_hash)
          if (isMatch) {
            account = candidate
            break
          }
        }
      }
    }

    if (!account) {
      rateLimit.recordFailure()
      return NextResponse.json(
        { error: 'Invalid passcode. Please try again.' },
        { status: 401 }
      )
    }

    if (account.staff && !account.staff.is_active) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Contact admin.' },
        { status: 403 }
      )
    }

    // Verify password if account was found via username lookup
    const valid = await verifyPassword(passcode, account.password_hash)
    if (!valid) {
      rateLimit.recordFailure()
      return NextResponse.json(
        { error: 'Invalid passcode. Please try again.' },
        { status: 401 }
      )
    }

    rateLimit.reset()
    const token = await createSession(account.id, 'staff')

    const response = NextResponse.json({
      success: true,
      token,
      role: 'staff',
      staff_id: account.staff_id,
      name: account.staff ? account.staff.name : '',
      designation: account.staff ? account.staff.designation : ''
    })

    // Set secure HTTP-only cookies
    response.cookies.set('cc_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    })
    response.cookies.set('cc_role', 'staff', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    })

    return response
  } catch (error) {
    console.error('Staff login error:', error)
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}
