import { NextResponse } from 'next/server'
import { loginCostingUser, setSessionCookie, COOKIE_NAME, getTokenFromRequest, validateCostingSession, clearSessionCookie } from '../../../../../lib/costing-auth'

// POST /api/costing/auth/login
export async function POST(request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const { token, user } = await loginCostingUser(email, password)

    const response = NextResponse.json({ ok: true, user })
    response.headers.set('Set-Cookie', setSessionCookie(token))
    return response
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 })
  }
}

// DELETE /api/costing/auth/login  (logout)
export async function DELETE(request) {
  const { deleteCostingSession } = await import('../../../../../lib/costing-auth')
  const token = getTokenFromRequest(request)
  if (token) await deleteCostingSession(token)

  const response = NextResponse.json({ ok: true })
  response.headers.set('Set-Cookie', clearSessionCookie())
  return response
}

// GET /api/costing/auth/login  (check session)
export async function GET(request) {
  const token = getTokenFromRequest(request)
  const session = await validateCostingSession(token)
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 })
  return NextResponse.json({ authenticated: true, role: session.role, userId: session.user_id })
}
