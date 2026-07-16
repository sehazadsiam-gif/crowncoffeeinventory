import bcrypt from 'bcryptjs'
import { supabase } from './supabase'

// ─── Session Management ─────────────────────────────────────

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 64 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createCostingSession(userId, role) {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const { error } = await supabase.from('costing_sessions').insert({
    user_id: userId,
    role,
    token,
    expires_at: expiresAt.toISOString(),
  })

  if (error) throw error
  return token
}

export async function validateCostingSession(token) {
  if (!token) return null

  const { data, error } = await supabase
    .from('costing_sessions')
    .select('id, user_id, role, expires_at')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return null
  return data // { id, user_id, role, expires_at }
}

export async function deleteCostingSession(token) {
  if (!token) return
  await supabase.from('costing_sessions').delete().eq('token', token)
}

// ─── User Auth ───────────────────────────────────────────────

export async function loginCostingRolePassword(role, password) {
  const CHEF_PWD  = 'chef@cc'
  const ADMIN_PWD = 'ccadmin6789'

  const trimmedRole = String(role || '').toLowerCase().trim()
  const trimmedPwd  = String(password || '').trim()

  if (trimmedRole === 'chef') {
    if (trimmedPwd !== CHEF_PWD) {
      throw new Error('Incorrect password for Chef / Barista access')
    }
    let { data: user } = await supabase
      .from('costing_users')
      .select('id, email, name, role')
      .eq('role', 'chef')
      .limit(1)
      .maybeSingle()

    if (!user) {
      user = await createCostingUser('chef@crowncoffee.com', CHEF_PWD, 'Head Chef', 'chef')
    }
    const token = await createCostingSession(user.id, 'chef')
    return { token, user: { id: user.id, name: user.name, role: 'chef', email: user.email } }
  }

  if (trimmedRole === 'admin') {
    if (trimmedPwd !== ADMIN_PWD) {
      throw new Error('Incorrect password for Admin access')
    }
    let { data: user } = await supabase
      .from('costing_users')
      .select('id, email, name, role')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle()

    if (!user) {
      user = await createCostingUser('admin@crowncoffee.com', ADMIN_PWD, 'Crown Admin', 'admin')
    }
    const token = await createCostingSession(user.id, 'admin')
    return { token, user: { id: user.id, name: user.name, role: 'admin', email: user.email } }
  }

  throw new Error('Invalid role specified')
}

export async function loginCostingUser(email, password) {
  const { data: user, error } = await supabase
    .from('costing_users')
    .select('id, email, name, role, password_hash, is_active')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !user) throw new Error('Invalid email or password')
  if (!user.is_active) throw new Error('Account is disabled')

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw new Error('Invalid email or password')

  const token = await createCostingSession(user.id, user.role)
  return { token, user: { id: user.id, name: user.name, role: user.role, email: user.email } }
}

export async function createCostingUser(email, password, name, role) {
  const hash = await bcrypt.hash(password, 10)
  const { data, error } = await supabase
    .from('costing_users')
    .insert({ email: email.toLowerCase().trim(), password_hash: hash, name, role })
    .select('id, email, name, role')
    .single()

  if (error) throw error
  return data
}

// ─── Cookie Helpers (for API routes) ────────────────────────

export const COOKIE_NAME = 'cc_costing_token'
export const COOKIE_OPTIONS = 'HttpOnly; Path=/; Max-Age=604800; SameSite=Lax'

export function getTokenFromRequest(request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))
  return match ? match[1] : null
}

export function setSessionCookie(token) {
  return `${COOKIE_NAME}=${token}; ${COOKIE_OPTIONS}`
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`
}

export async function requireRole(request, ...allowedRoles) {
  let token = getTokenFromRequest(request)
  let session = await validateCostingSession(token)

  if (!session) {
    // Fallback: check main app session (cc_token cookie or Authorization header)
    const cookieHeader = request.headers.get('cookie') || ''
    const match = cookieHeader.match(/(?:^|;\s*)cc_token=([^;]+)/)
    const authHeader = request.headers.get('authorization')
    const mainToken = (match ? match[1] : null) || (authHeader ? authHeader.replace(/^Bearer\s+/, '') : null)

    if (mainToken) {
      const { validateSession } = await import('./auth')
      const mainSession = await validateSession(mainToken)
      if (mainSession && (mainSession.role === 'admin' || mainSession.role === 'sub_admin')) {
        session = { role: 'admin', user_id: mainSession.user_id }
      }
    }
  }

  if (!session) {
    return { error: 'Unauthorized', status: 401, session: null }
  }
  if (!allowedRoles.includes(session.role)) {
    return { error: 'Forbidden', status: 403, session: null }
  }
  return { error: null, status: 200, session }
}
