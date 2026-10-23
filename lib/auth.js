import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from './supabase'

export async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password, hash) {
  if (!password || !hash) return false
  try {
    return await bcrypt.compare(password, hash)
  } catch (e) {
    return false
  }
}

/**
 * Generates a cryptographically strong 64-character random session token
 */
export function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Verifies Master Admin PIN against environment variable or fallback
 */
export function verifyMasterPin(inputPin) {
  if (!inputPin) return false
  const masterPin = process.env.ADMIN_MASTER_PIN || '1590'
  return String(inputPin).trim() === String(masterPin).trim()
}

/**
 * Creates a database-persisted session for a user
 */
export async function createSession(userId, role) {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const { error } = await supabaseAdmin.from('sessions').insert([{
    user_id: userId,
    role,
    token,
    expires_at: expiresAt.toISOString()
  }])

  if (error) {
    console.error('[auth] createSession error:', error.message)
    throw error
  }
  return token
}

/**
 * Validates a session token against Supabase sessions
 */
export async function validateSession(token) {
  if (!token) return null

  // Temporary transition support for previously active browser sessions
  if (token === 'admin_pin_session') {
    return { user_id: 'admin_pin_user', role: 'admin', token }
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (error || !data) return null
    return data
  } catch (e) {
    console.error('[auth] validateSession exception:', e.message)
    return null
  }
}

/**
 * Deletes an active session
 */
export async function deleteSession(token) {
  if (!token) return
  try {
    await supabaseAdmin.from('sessions').delete().eq('token', token)
  } catch (e) {}
}

/**
 * Validates session and checks for admin or sub_admin role
 */
export async function verifyAdminAuth(token) {
  const session = await validateSession(token)
  if (!session) return null
  if (session.role !== 'admin' && session.role !== 'sub_admin' && session.role !== 'manager') return null
  return session
}

/**
 * Helper for API Route Handlers to verify incoming Admin request.
 * Checks Bearer Authorization header or cc_token cookie.
 */
export async function verifyAdminRequest(request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    
    if (!token) {
      token = request.cookies.get('cc_token')?.value
    }

    if (!token) {
      const xPin = request.headers.get('x-admin-pin')
      if (verifyMasterPin(xPin)) {
        return { authenticated: true, session: { role: 'admin', user_id: 'admin_pin' } }
      }
      return { authenticated: false, error: 'Unauthorized: Missing session token', status: 401 }
    }

    const session = await validateSession(token)
    if (!session || (session.role !== 'admin' && session.role !== 'sub_admin' && session.role !== 'manager')) {
      return { authenticated: false, error: 'Forbidden: Admin access required', status: 403 }
    }

    return { authenticated: true, session }
  } catch (err) {
    return { authenticated: false, error: 'Internal auth error', status: 500 }
  }
}

/**
 * Helper for API Route Handlers to verify incoming Staff or Admin request.
 */
export async function verifyStaffOrAdminRequest(request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    
    if (!token) {
      token = request.cookies.get('cc_token')?.value
    }

    if (!token) {
      return { authenticated: false, error: 'Unauthorized: Missing session token', status: 401 }
    }

    const session = await validateSession(token)
    if (!session) {
      return { authenticated: false, error: 'Forbidden: Invalid session', status: 403 }
    }

    return { authenticated: true, session }
  } catch (err) {
    return { authenticated: false, error: 'Internal auth error', status: 500 }
  }
}
