import { supabaseAdmin } from '../../../../lib/supabase'
import { hashPassword } from '../../../../lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { staff_id, password, username } = await request.json()

    if (!staff_id || !password) {
      return Response.json(
        { error: 'Staff ID and passcode/password are required' },
        { status: 400 }
      )
    }

    if (password.length < 4) {
      return Response.json(
        { error: 'Passcode must be at least 4 characters' },
        { status: 400 }
      )
    }

    let cleanUsername = (username || '').toLowerCase().trim()

    // If username not explicitly provided, derive from passcode (e.g. name@cc -> name)
    if (!cleanUsername) {
      const cleanPass = password.toLowerCase().trim()
      if (cleanPass.includes('@cc')) {
        cleanUsername = cleanPass.split('@cc')[0].trim()
      } else {
        const { data: staffMember } = await supabaseAdmin
          .from('staff')
          .select('name')
          .eq('id', staff_id)
          .single()
        if (staffMember && staffMember.name) {
          cleanUsername = staffMember.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
        } else {
          cleanUsername = cleanPass.replace(/[^a-z0-9]/g, '')
        }
      }
    }

    // Check if another user is using this username
    const { data: existing } = await supabaseAdmin
      .from('staff_accounts')
      .select('id, staff_id')
      .eq('username', cleanUsername)
      .maybeSingle()

    if (existing && existing.staff_id !== staff_id) {
      return Response.json(
        { error: `The username/alias "${cleanUsername}" is already assigned to another staff member` },
        { status: 409 }
      )
    }

    const password_hash = await hashPassword(password.trim())

    // Check if staff already has account to update or insert
    const { data: accountExists } = await supabaseAdmin
      .from('staff_accounts')
      .select('id')
      .eq('staff_id', staff_id)
      .maybeSingle()

    let resultError

    if (accountExists) {
      // Update existing
      const { error } = await supabaseAdmin
        .from('staff_accounts')
        .update({ username: cleanUsername, password_hash })
        .eq('staff_id', staff_id)
      resultError = error
    } else {
      // Insert new - schema has (id, staff_id, username, password_hash)
      const { error } = await supabaseAdmin
        .from('staff_accounts')
        .insert([{ 
          staff_id, 
          username: cleanUsername, 
          password_hash
        }])
      resultError = error
    }

    if (resultError) {
      console.error('[set-credentials DB error]', resultError)
      throw resultError
    }

    return Response.json({ success: true, message: 'Passcode saved successfully', username: cleanUsername })

  } catch (error) {
    console.error('Set credentials error:', error)
    return Response.json(
      { error: error.message || 'Failed to save passcode. Please try again.' },
      { status: 500 }
    )
  }
}
