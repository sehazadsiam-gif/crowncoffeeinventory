import bcrypt from 'bcryptjs'
import { supabase } from './supabase'

export async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export async function createSession(userId, role) {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const { error } = await supabase.from('sessions').insert([{
    user_id: userId,
    role,
    token,
    expires_at: expiresAt.toISOString()
  }])

  if (error) throw error
  return token
}

export async function validateSession(token) {
  if (!token) return null

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return null
  return data
}

export async function deleteSession(token) {
  await supabase.from('sessions').delete().eq('token', token)
}
