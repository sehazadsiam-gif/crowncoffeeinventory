import { supabase } from '../../../../lib/supabase'
import { verifyPassword, createSession } from '../../../../lib/auth'

export async function POST(request) {
  try {
    const body = await request.json()
    const rawPassword = body.password || body.passcode || body.pin || ''
    const rawUsername = body.username || ''

    if (!rawPassword && !rawUsername) {
      return Response.json(
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
      const { data } = await supabase
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
      const { data: allAccounts } = await supabase
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
      return Response.json(
        { error: 'Invalid passcode. Please try again.' },
        { status: 401 }
      )
    }

    if (account.staff && !account.staff.is_active) {
      return Response.json(
        { error: 'Your account has been deactivated. Contact admin.' },
        { status: 403 }
      )
    }

    // Verify password if account was found via username lookup
    const valid = await verifyPassword(passcode, account.password_hash)
    if (!valid) {
      return Response.json(
        { error: 'Invalid passcode. Please try again.' },
        { status: 401 }
      )
    }

    const token = await createSession(account.id, 'staff')

    return Response.json({
      success: true,
      token,
      role: 'staff',
      staff_id: account.staff_id,
      name: account.staff ? account.staff.name : '',
      designation: account.staff ? account.staff.designation : ''
    })
  } catch (error) {
    console.error('Staff login error:', error)
    return Response.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}

